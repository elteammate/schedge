use chrono::Duration;
use regex::Regex;

pub fn parse_duration(input: &str) -> Option<Duration> {
    if !input.starts_with('P') && !input.starts_with('T') {
        return None;
    }

    let re = Regex::new(
        r"(?x)
        ^P?                                # optional 'P'
        (?:(?P<years>\d+)Y)?              # years
        (?:(?P<months>\d+)M)?             # months
        (?:(?P<weeks>\d+)W)?              # weeks
        (?:(?P<days>\d+)D)?               # days
        (?:T                              # time part
            (?:(?P<hours>\d+)H)?         # hours
            (?:(?P<minutes>\d+)M)?       # minutes
            (?:(?P<seconds>\d+)S)?       # seconds
        )?$"
    ).unwrap();

    let caps = re.captures(input)?;

    let years = caps.name("years").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let months = caps.name("months").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let weeks = caps.name("weeks").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let days = caps.name("days").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let hours = caps.name("hours").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let minutes = caps.name("minutes").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));
    let seconds = caps.name("seconds").map_or(0, |m| m.as_str().parse::<i64>().unwrap_or(0));

    let total_days = years * 365 + months * 30 + weeks * 7 + days;
    let total_seconds = total_days * 86400 + hours * 3600 + minutes * 60 + seconds;

    Some(Duration::seconds(total_seconds))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration() {
        assert_eq!(parse_duration("P3Y6M4DT12H30M5S").unwrap(), Duration::seconds((3 * 365 + 6 * 30 + 4) * 86400 + 12 * 3600 + 30 * 60 + 5));
        assert_eq!(parse_duration("T3600S").unwrap(), Duration::seconds(3600));
        assert_eq!(parse_duration("P2W").unwrap(), Duration::seconds(2 * 7 * 86400));
        assert_eq!(parse_duration("P1D").unwrap(), Duration::seconds(86400));
        assert_eq!(parse_duration("T1H30M").unwrap(), Duration::seconds(5400));
        assert!(parse_duration("Invalid").is_none());
    }
}