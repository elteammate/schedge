use std::cmp::Ordering;
use std::ops::{Add, Div};
use anyhow::bail;
use chrono::{DateTime, Duration, DurationRound, Utc};
use rand::prelude::IndexedRandom;
use rand::SeedableRng;
use smol_str::SmolStr;

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Slot {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub task_id: SmolStr,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct ProjectTimings {
    pub work: Duration,
    pub small_break: Duration,
    pub large_break: Duration,
    pub number_of_small_breaks: u32,
}

#[derive(Debug, Clone)]
pub enum Task {
    Fixed {
        id: SmolStr,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        leisure: bool,
    },
    Continuous {
        id: SmolStr,
        duration: Duration,
        kickoff: DateTime<Utc>,
        deadline: DateTime<Utc>,
        leisure: bool,
    },
    Project {
        id: SmolStr,
        duration: Duration,
        kickoff: DateTime<Utc>,
        deadline: DateTime<Utc>,
        timings: ProjectTimings,
        leisure: bool,
    },
}

#[derive(Debug, Clone, Ord, PartialOrd, Eq, PartialEq)]
struct PredefinedSlot {
    id: SmolStr,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
    leisure: bool,
}

#[derive(Debug, Clone)]
struct DynamicSlot {
    id: SmolStr,
    duration: Duration,
    kickoff: DateTime<Utc>,
    deadline: DateTime<Utc>,
    leisure: bool,
}

pub fn monte_carlo_schedule(tasks: &[Task], now: DateTime<Utc>, seed: u64) -> anyhow::Result<Vec<Slot>> {
    let mut budget = 1000_000;

    let mut rng = rand::rngs::StdRng::seed_from_u64(seed);

    let mut best_slots: Option<Vec<Slot>> = None;
    let mut best_score = f64::NEG_INFINITY;

    let mut predefined_slots: Vec<PredefinedSlot> = Vec::new();
    let mut dynamic_slots: Vec<DynamicSlot> = Vec::new();

    for task in tasks {
        match task {
            Task::Fixed { id, start, end, leisure } => {
                predefined_slots.push(PredefinedSlot {
                    id: id.clone(),
                    start: *start,
                    end: *end,
                    leisure: *leisure,
                });
            }
            Task::Continuous { id, duration, kickoff, deadline, leisure } => {
                dynamic_slots.push(DynamicSlot {
                    id: id.clone(),
                    duration: *duration,
                    kickoff: *kickoff,
                    deadline: *deadline,
                    leisure: *leisure,
                });
            }
            Task::Project { id, duration, kickoff, deadline, timings, leisure } => {
                let work = timings.work;
                let mut total_counted = Duration::zero();
                if duration.div(1000) > work {
                    bail!("There are too many pieces in the project item");
                }
                while total_counted < *duration {
                    dynamic_slots.push(DynamicSlot {
                        id: id.clone(),
                        duration: work,
                        kickoff: *kickoff,
                        deadline: *deadline,
                        leisure: *leisure,
                    });

                    total_counted += work;
                }
            }
        }
    }

    predefined_slots.sort();

    let does_overlap = |start: DateTime<Utc>, end: DateTime<Utc>| {
        predefined_slots.binary_search_by(|slot| {
            if end <= slot.start {
                Ordering::Less
            } else if start >= slot.end {
                Ordering::Greater
            } else {
                Ordering::Equal
            }
        })
    };

    let mut initial_slots = Vec::new();
    for predefined in &predefined_slots {
        initial_slots.push(Slot {
            start: predefined.start,
            end: predefined.end,
            task_id: predefined.id.clone(),
        });
    }
    
    if dynamic_slots.is_empty() {
        return Ok(initial_slots);
    }

    'outer: loop {
        let mut slots: Vec<Slot> = initial_slots.clone();
        let mut t = now;
        let mut last_was_leisure = false;
        let mut used = vec![false; dynamic_slots.len()];

        loop {
            if t > now + Duration::days(28) {
                break;
            }

            let mut num_outdated_options = 0;
            let mut options = Vec::new();
            let mut first_kickoff = None;
            for (i, task) in dynamic_slots.iter().enumerate() {
                if used[i] {
                    continue;
                }
                if t < task.kickoff {
                    if first_kickoff.is_none() || task.kickoff < first_kickoff.unwrap() {
                        first_kickoff = Some(task.kickoff);
                    }
                    continue;
                }
                if t + task.duration > task.deadline {
                    num_outdated_options += 1;
                    continue;
                }
                if does_overlap(t, t + task.duration).is_ok() {
                    continue;
                }
                if !last_was_leisure && !task.leisure {
                    continue;
                }
                options.push(i);
            }
            
            if num_outdated_options == dynamic_slots.len() {
                break;
            }

            budget -= dynamic_slots.len() as i64;
            if budget < 0 {
                break 'outer;
            }

            if first_kickoff.is_some() && first_kickoff.unwrap() > t {
                t = first_kickoff.unwrap();
                last_was_leisure = true;
                continue;
            }

            if options.is_empty() {
                t = t.add(Duration::minutes(30)).duration_round(Duration::minutes(10))?;
                last_was_leisure = true;
                continue;
            }

            t = match does_overlap(t, t) {
                Ok(i) => {
                    predefined_slots[i].end
                },
                Err(_) => t,
            };

            let task_index = *options.choose(&mut rng).unwrap();
            let task = &dynamic_slots[task_index];
            used[task_index] = true;

            slots.push(Slot {
                start: t,
                end: t + task.duration,
                task_id: task.id.clone(),
            });

            t += task.duration;
            last_was_leisure = task.leisure;
        }

        let score = 0.0;
        if score > best_score {
            best_score = score;
            best_slots = Some(slots);
        }
    }

    best_slots
        .ok_or_else(|| anyhow::anyhow!("No valid schedule found"))
}
