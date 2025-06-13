import { describe, it, expect } from "vitest";
import { DateTime, Duration } from "luxon";
import { taskFromEditableTask, editableTaskFromTask, EditableTask } from "./TaskList";
import { Task } from "./api";

describe("taskFromEditableTask", () => {
  it("should convert an editable fixed task to a Task", () => {
    const editableTask = {
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: DateTime.now(),
      end: DateTime.now().plus({ hours: 1 }),
      duration: Duration.fromObject({ hours: 1 }),
      kickoff: DateTime.now(),
      deadline: DateTime.now().plus({ days: 1 }),
      timings: {
        work: Duration.fromObject({ minutes: 25 }),
        smallBreak: Duration.fromObject({ minutes: 5 }),
        bigBreak: Duration.fromObject({ minutes: 20 }),
        numberOfSmallBreaks: 4,
      },
    };

    const task = taskFromEditableTask(<EditableTask>editableTask);
    expect(task).toEqual({
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: editableTask.start,
      end: editableTask.end,
    });
  });

  it("should convert an editable continuous task to a Task", () => {
    const editableTask = {
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      start: DateTime.now(),
      end: DateTime.now(),
      duration: Duration.fromObject({ hours: 2 }),
      kickoff: DateTime.now(),
      deadline: DateTime.now().plus({ days: 2 }),
      timings: {
        work: Duration.fromObject({ minutes: 25 }),
        smallBreak: Duration.fromObject({ minutes: 5 }),
        bigBreak: Duration.fromObject({ minutes: 20 }),
        numberOfSmallBreaks: 4,
      },
    };

    const task = taskFromEditableTask(<EditableTask>editableTask);
    expect(task).toEqual({
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      duration: editableTask.duration,
      kickoff: editableTask.kickoff,
      deadline: editableTask.deadline,
    });
  });

  it("should convert an editable project task to a Task", () => {
    const editableTask = {
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      start: DateTime.now(),
      end: DateTime.now(),
      duration: Duration.fromObject({ hours: 3 }),
      kickoff: DateTime.now(),
      deadline: DateTime.now().plus({ days: 3 }),
      timings: {
        work: Duration.fromObject({ minutes: 50 }),
        smallBreak: Duration.fromObject({ minutes: 10 }),
        bigBreak: Duration.fromObject({ minutes: 30 }),
        numberOfSmallBreaks: 5,
      },
    };

    const task = taskFromEditableTask(<EditableTask>editableTask);
    expect(task).toEqual({
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      duration: editableTask.duration,
      kickoff: editableTask.kickoff,
      deadline: editableTask.deadline,
      timings: editableTask.timings,
    });
  });
});

describe("editableTaskFromTask", () => {
  it("should convert a fixed Task to an editable task", () => {
    const task: Task = {
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: DateTime.now(),
      end: DateTime.now().plus({ hours: 1 }),
    };

    const editableTask = editableTaskFromTask(task);
    expect(editableTask).toMatchObject({
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: task.start,
      end: task.end,
      // duration: Duration.fromObject({ hours: 1 }),
      kickoff: DateTime.now(),
      // deadline: DateTime.now().plus({ days: 1 }),
      timings: {
        // work: Duration.fromObject({ minutes: 25 }),
        // smallBreak: Duration.fromObject({ minutes: 5 }),
        // bigBreak: Duration.fromObject({ minutes: 20 }),
        numberOfSmallBreaks: 4,
      },
    });
  });

  it("should convert a continuous Task to an editable task", () => {
    const task: Task = {
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      duration: Duration.fromObject({ hours: 2 }),
      kickoff: DateTime.now(),
      deadline: DateTime.now().plus({ days: 2 }),
    };

    const editableTask = editableTaskFromTask(task);
    expect(editableTask).toMatchObject({
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      start: DateTime.now(),
      end: DateTime.now(),
      duration: task.duration,
      kickoff: task.kickoff,
      deadline: task.deadline,
      timings: {
        // work: Duration.fromObject({ minutes: 25 }),
        // smallBreak: Duration.fromObject({ minutes: 5 }),
        // bigBreak: Duration.fromObject({ minutes: 20 }),
        numberOfSmallBreaks: 4,
      },
    });
  });

  it("should convert a project Task to an editable task", () => {
    const task: Task = {
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      duration: Duration.fromObject({ hours: 3 }),
      kickoff: DateTime.now(),
      deadline: DateTime.now().plus({ days: 3 }),
      timings: {
        work: Duration.fromObject({ minutes: 50 }),
        smallBreak: Duration.fromObject({ minutes: 10 }),
        bigBreak: Duration.fromObject({ minutes: 30 }),
        numberOfSmallBreaks: 5,
      },
    };

    const editableTask = editableTaskFromTask(task);
    expect(editableTask).toEqual({
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      start: DateTime.now(),
      end: DateTime.now(),
      duration: task.duration,
      kickoff: task.kickoff,
      deadline: task.deadline,
      timings: task.timings,
    });
  });
});
