use collapse::collapse;
use chrono::{DateTime, Duration};
use schedge_solver::{ProjectTimings, Task, monte_carlo_schedule};

#[test]
fn solve_example() {
    let tasks = vec![
        Task::Project {
            id: "a".into(),
            duration: Duration::hours(2),
            kickoff: DateTime::parse_from_rfc3339("2023-10-01T09:00:00Z").unwrap().with_timezone(&chrono::Utc),
            deadline: DateTime::parse_from_rfc3339("2023-10-03T09:00:00Z").unwrap().with_timezone(&chrono::Utc),
            timings: ProjectTimings {
                work: Duration::minutes(25),
                small_break: Duration::minutes(5),
                large_break: Duration::minutes(15),
                number_of_small_breaks: 2,
            },
            leisure: false,
        },
        Task::Fixed {
            id: "b".into(),
            start: DateTime::parse_from_rfc3339("2023-10-01T09:00:00Z").unwrap().with_timezone(&chrono::Utc),
            end: DateTime::parse_from_rfc3339("2023-10-01T10:00:00Z").unwrap().with_timezone(&chrono::Utc),
            leisure: false,
        },
    ];

    let schedule = monte_carlo_schedule(
        &tasks,
        DateTime::parse_from_rfc3339("2023-10-01T09:00:00Z").unwrap().with_timezone(&chrono::Utc),
        0
    ).expect("Failed to schedule tasks");
    
    println!("{:#?}", schedule);
    collapse::collapsed_eq!(&format!("{:#?}", schedule), r#"
[
    Slot {
        start: 2023-10-01T09:00:00Z,
        end: 2023-10-01T10:00:00Z,
        task_id: "b",
    },
    Slot {
        start: 2023-10-01T10:00:00Z,
        end: 2023-10-01T10:25:00Z,
        task_id: "a",
    },
    Slot {
        start: 2023-10-01T11:00:00Z,
        end: 2023-10-01T11:25:00Z,
        task_id: "a",
    },
    Slot {
        start: 2023-10-01T12:00:00Z,
        end: 2023-10-01T12:25:00Z,
        task_id: "a",
    },
    Slot {
        start: 2023-10-01T13:00:00Z,
        end: 2023-10-01T13:25:00Z,
        task_id: "a",
    },
    Slot {
        start: 2023-10-01T14:00:00Z,
        end: 2023-10-01T14:25:00Z,
        task_id: "a",
    },
]
    "#);
    
    println!("Generated schedule: {:#?}", schedule);
}