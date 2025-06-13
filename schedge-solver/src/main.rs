mod duration;

use actix_web::{post, web, App, HttpResponse, HttpServer, Responder};
use chrono::{DateTime, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use smol_str::SmolStr;
use schedge_solver::{monte_carlo_schedule, ProjectTimings, Slot, Task};
use crate::duration::parse_duration;
use log::{info, error};

#[derive(Debug, Clone, Deserialize, Serialize)]
struct RawBaseTask {
    id: SmolStr,
    name: String,
    description: Option<String>,
    color: String,
    leisure: bool,
    dependencies: Vec<u32>,
    nonce: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type")]
enum RawTask {
    #[serde(rename = "fixed")]
    Fixed(RawFixedTask),
    #[serde(rename = "continuous")]
    Continuous(RawContinuousTask),
    #[serde(rename = "project")]
    Project(RawProjectTask),
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct RawFixedTask {
    #[serde(flatten)]
    base: RawBaseTask,
    start: String,
    end: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct RawContinuousTask {
    #[serde(flatten)]
    base: RawBaseTask,
    duration: String,
    kickoff: String,
    deadline: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct RawProjectTask {
    #[serde(flatten)]
    base: RawBaseTask,
    duration: String,
    kickoff: String,
    deadline: String,
    timings: RawProjectTimings,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct RawProjectTimings {
    work: String,
    #[serde(rename = "smallBreak")]
    small_break: String,
    #[serde(rename = "bigBreak")]
    big_break: String,
    #[serde(rename = "numberOfSmallBreaks")]
    number_of_small_breaks: u32,
}

#[derive(Debug, Clone, Serialize)]
struct RawSlot {
    start: String,
    end: String,
    task: RawTask,
}

fn raw_task_to_task(raw: &RawTask) -> anyhow::Result<Task> {
    info!("Converting raw task to internal task representation: {:?}", raw);
    let task = match raw {
        RawTask::Fixed(fixed) => Task::Fixed {
            id: fixed.base.id.clone(),
            start: DateTime::parse_from_rfc3339(&fixed.start)?.with_timezone(&Utc),
            end: DateTime::parse_from_rfc3339(&fixed.end)?.with_timezone(&Utc),
            leisure: fixed.base.leisure,
        },
        RawTask::Continuous(cont) => Task::Continuous {
            id: cont.base.id.clone(),
            duration: parse_duration(&cont.duration).ok_or(anyhow::anyhow!("Invalid duration format"))?,
            kickoff: DateTime::from_str(&cont.kickoff)?,
            deadline: DateTime::from_str(&cont.deadline)?,
            leisure: cont.base.leisure,
        },
        RawTask::Project(proj) => Task::Project {
            id: proj.base.id.clone(),
            duration: parse_duration(&proj.duration).ok_or(anyhow::anyhow!("Invalid duration format"))?,
            kickoff: DateTime::from_str(&proj.kickoff)?,
            deadline: DateTime::from_str(&proj.deadline)?,
            timings: ProjectTimings {
                work: parse_duration(&proj.timings.work).ok_or(anyhow::anyhow!("Invalid work duration format"))?,
                small_break: parse_duration(&proj.timings.small_break).ok_or(anyhow::anyhow!("Invalid small break duration format"))?,
                large_break: parse_duration(&proj.timings.big_break).ok_or(anyhow::anyhow!("Invalid large break duration format"))?,
                number_of_small_breaks: proj.timings.number_of_small_breaks,
            },
            leisure: proj.base.leisure,
        },
    };
    info!("Successfully converted raw task to internal task: {:?}", task);
    Ok(task)
}

fn round_up_to_five_minutes(t: DateTime<Utc>) -> DateTime<Utc> {
    let secs = (t.timestamp() + 299) / 300 * 300;
    let rounded_time = DateTime::<Utc>::from_timestamp(secs, 0).unwrap_or(t);
    rounded_time
}

fn convert_to_raw_slots(slots: &[Slot], tasks: Vec<RawTask>) -> Vec<RawSlot> {
    info!("Converting internal slots to raw slots...");
    let raw_slots = slots
        .iter()
        .map(|slot| {
            let task = tasks.iter().find(|t| match t {
                RawTask::Fixed(fixed) => fixed.base.id == slot.task_id,
                RawTask::Continuous(cont) => cont.base.id == slot.task_id,
                RawTask::Project(proj) => proj.base.id == slot.task_id,
            }).cloned().unwrap();

            RawSlot {
                start: slot.start.to_rfc3339(),
                end: slot.end.to_rfc3339(),
                task,
            }
        })
        .collect();
    info!("Successfully converted slots to raw slots.");
    raw_slots
}

#[post("/schedule")]
async fn schedule(raw_tasks: web::Json<Vec<RawTask>>) -> impl Responder {
    info!("Received scheduling request with tasks: {:?}", raw_tasks);
    let now = round_up_to_five_minutes(Utc::now());
    let tasks = raw_tasks
        .0
        .iter()
        .map(|raw| raw_task_to_task(raw))
        .collect::<anyhow::Result<Vec<Task>>>();

    let Ok(tasks) = tasks else {
        error!("Failed to parse tasks from request.");
        return HttpResponse::BadRequest().body("Invalid task data");
    };

    info!("Successfully parsed tasks. Starting scheduling...");
    let schedule = match monte_carlo_schedule(&tasks, now, now.nanosecond() as u64) {
        Ok(schedule) => {
            info!("Successfully generated schedule.");
            schedule
        },
        Err(e) => {
            error!("Failed to generate schedule: {:?}", e);
            return HttpResponse::NotFound().body("Failed to generate schedule");
        }
    };

    let raw_slots = convert_to_raw_slots(&schedule, raw_tasks.0.clone());
    info!("Returning generated schedule as response.");
    HttpResponse::Ok().json(raw_slots)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    info!("Starting Schedge Solver server...");
    HttpServer::new(|| App::new().service(schedule))
        .bind(("127.0.0.1", 6000))?
        .run()
        .await
}
