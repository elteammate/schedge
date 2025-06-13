#![no_main]

use libfuzzer_sys::fuzz_target;
use schedge_solver::{monte_carlo_schedule, Task};
use chrono::{DateTime, Utc};
use std::str::from_utf8;

fuzz_target!(|data: &[u8]| {
    let tasks: Vec<Task> = match parse_tasks_from_bytes(data) {
        Ok(tasks) => tasks,
        Err(_) => return,
    };

    let now = Utc::now();

    let _ = monte_carlo_schedule(&tasks, now, now.timestamp_nanos_opt().unwrap() as u64);
});

fn parse_tasks_from_bytes(data: &[u8]) -> Result<Vec<Task>, ()> {
    let input = from_utf8(data).map_err(|_| ())?;
    let mut tasks = Vec::new();

    for line in input.lines() {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 4 {
            continue;
        }

        let id = parts[0].into();
        let leisure = parts[1].parse::<bool>().map_err(|_| ())?;
        let start = DateTime::parse_from_rfc3339(parts[2]).map_err(|_| ())?.with_timezone(&Utc);
        let end = DateTime::parse_from_rfc3339(parts[3]).map_err(|_| ())?.with_timezone(&Utc);

        tasks.push(Task::Fixed {
            id,
            start,
            end,
            leisure,
        });
    }

    Ok(tasks)
}
