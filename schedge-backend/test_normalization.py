import pytest
from datetime import datetime, timedelta
from main import normalize_duration, normalize_datetime, normalize_task_dates


def test_normalize_duration():
    assert normalize_duration("PT5M") == "PT5M"
    assert normalize_duration("PT10M") == "PT10M"
    assert normalize_duration("PT72H") == "PT4320M"
    assert normalize_duration("PT100H") == "PT4320M"
    assert normalize_duration("P1DT2H30M") == "PT1590M"

    assert normalize_duration("INVALID") == "PT60M"
    assert normalize_duration("") == "PT60M"

    assert normalize_duration("PT0M") == "PT5M"
    assert normalize_duration("PT9999999H") == "PT4320M"


def test_normalize_datetime():
    assert normalize_datetime("2023-05-01T10:15:45Z") == "2023-05-01T10:16:00+00:00"
    assert normalize_datetime("2023-05-01T10:15:15Z") == "2023-05-01T10:15:00+00:00"
    assert normalize_datetime("2023-05-01T10:00:00Z") == "2023-05-01T10:00:00+00:00"

    assert normalize_datetime("INVALID") == "INVALID"
    assert normalize_datetime("") == ""


def test_normalize_task_dates():
    fixed_task = {
        "type": "fixed",
        "start": "2023-05-01T10:15:45Z",
        "end": "2023-05-01T10:20:00Z",
    }
    normalized_task = normalize_task_dates(fixed_task)
    assert normalized_task["start"] == "2023-05-01T10:16:00+00:00"
    assert normalized_task["end"] == "2023-05-01T10:21:00+00:00"

    continuous_task = {
        "type": "continuous",
        "kickoff": "2023-05-01T10:15:45Z",
        "deadline": "2023-05-02T10:15:45Z",
        "duration": "PT100H",
    }
    normalized_task = normalize_task_dates(continuous_task)
    assert normalized_task["kickoff"] == "2023-05-01T10:16:00+00:00"
    assert normalized_task["deadline"] == "2023-05-02T10:16:00+00:00"
    assert normalized_task["duration"] == "PT4320M"

    project_task = {
        "type": "project",
        "kickoff": "2023-05-01T10:15:45Z",
        "deadline": "2023-05-02T10:15:45Z",
        "duration": "PT100H",
        "timings": {
            "work": "PT8H",
            "smallBreak": "PT15M",
            "bigBreak": "PT1H",
        },
    }
    normalized_task = normalize_task_dates(project_task)
    assert normalized_task["kickoff"] == "2023-05-01T10:16:00+00:00"
    assert normalized_task["deadline"] == "2023-05-02T10:16:00+00:00"
    assert normalized_task["duration"] == "PT4320M"
    assert normalized_task["timings"]["work"] == "PT480M"
    assert normalized_task["timings"]["smallBreak"] == "PT15M"
    assert normalized_task["timings"]["bigBreak"] == "PT60M"
