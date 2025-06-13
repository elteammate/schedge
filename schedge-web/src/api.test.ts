import { describe, it, expect } from "vitest";
import { DateTime, Duration } from "luxon";
import {
  rawToClientTask,
  clientToRawTask,
  rawToClientSlot,
  parseISODate,
  serializeDate,
  parseISODuration,
  serializeDuration, RawTask, Task, RawSlot,
} from "./api";

describe("rawToClientTask", () => {
  it("should convert a raw fixed task to a client task", () => {
    const rawTask: RawTask = {
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: "2023-05-01T10:00:00.000Z",
      end: "2023-05-01T12:00:00.000Z",
    };

    const clientTask = rawToClientTask(rawTask);
    expect(clientTask).toEqual({
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: parseISODate(rawTask.start),
      end: parseISODate(rawTask.end),
    });
  });

  it("should convert a raw continuous task to a client task", () => {
    const rawTask: RawTask = {
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      duration: "PT2H",
      kickoff: "2023-05-01T10:00:00.000Z",
      deadline: "2023-05-02T10:00:00.000Z",
    };

    const clientTask = rawToClientTask(rawTask);
    expect(clientTask).toEqual({
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      duration: parseISODuration(rawTask.duration),
      kickoff: parseISODate(rawTask.kickoff),
      deadline: parseISODate(rawTask.deadline),
    });
  });

  it("should convert a raw project task to a client task", () => {
    const rawTask: RawTask = {
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      duration: "PT3H",
      kickoff: "2023-05-01T10:00:00.000Z",
      deadline: "2023-05-03T10:00:00.000Z",
      timings: {
        work: "PT50M",
        smallBreak: "PT10M",
        bigBreak: "PT30M",
        numberOfSmallBreaks: 5,
      },
    };

    const clientTask = rawToClientTask(rawTask);
    expect(clientTask).toEqual({
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      duration: parseISODuration(rawTask.duration),
      kickoff: parseISODate(rawTask.kickoff),
      deadline: parseISODate(rawTask.deadline),
      timings: {
        work: parseISODuration(rawTask.timings.work),
        smallBreak: parseISODuration(rawTask.timings.smallBreak),
        bigBreak: parseISODuration(rawTask.timings.bigBreak),
        numberOfSmallBreaks: rawTask.timings.numberOfSmallBreaks,
      },
    });
  });
});

describe("clientToRawTask", () => {
  it("should convert a client fixed task to a raw task", () => {
    const clientTask: Task = {
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: DateTime.now(),
      end: DateTime.now().plus({ hours: 2 }),
    };

    const rawTask = clientToRawTask(clientTask);
    expect(rawTask).toEqual({
      id: "1",
      name: "Fixed Task",
      description: "A fixed task",
      color: "#FF0000",
      leisure: false,
      dependencies: [],
      nonce: 1,
      type: "fixed",
      start: serializeDate(clientTask.start),
      end: serializeDate(clientTask.end),
    });
  });

  it("should convert a client continuous task to a raw task", () => {
    const clientTask: Task = {
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
      deadline: DateTime.now().plus({ days: 1 }),
    };

    const rawTask = clientToRawTask(clientTask);
    expect(rawTask).toEqual({
      id: "2",
      name: "Continuous Task",
      description: "A continuous task",
      color: "#00FF00",
      leisure: true,
      dependencies: ["1"],
      nonce: 2,
      type: "continuous",
      duration: serializeDuration(clientTask.duration),
      kickoff: serializeDate(clientTask.kickoff),
      deadline: serializeDate(clientTask.deadline),
    });
  });

  it("should convert a client project task to a raw task", () => {
    const clientTask: Task = {
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
      deadline: DateTime.now().plus({ days: 2 }),
      timings: {
        work: Duration.fromObject({ minutes: 50 }),
        smallBreak: Duration.fromObject({ minutes: 10 }),
        bigBreak: Duration.fromObject({ minutes: 30 }),
        numberOfSmallBreaks: 5,
      },
    };

    const rawTask = clientToRawTask(clientTask);
    expect(rawTask).toEqual({
      id: "3",
      name: "Project Task",
      description: "A project task",
      color: "#0000FF",
      leisure: false,
      dependencies: [],
      nonce: 3,
      type: "project",
      duration: serializeDuration(clientTask.duration),
      kickoff: serializeDate(clientTask.kickoff),
      deadline: serializeDate(clientTask.deadline),
      timings: {
        work: serializeDuration(clientTask.timings.work),
        smallBreak: serializeDuration(clientTask.timings.smallBreak),
        bigBreak: serializeDuration(clientTask.timings.bigBreak),
        numberOfSmallBreaks: clientTask.timings.numberOfSmallBreaks,
      },
    });
  });
});

describe("rawToClientSlot", () => {
  it("should convert a raw slot to a client slot", () => {
    const rawSlot: RawSlot = {
      start: "2023-05-01T10:00:00.000Z",
      end: "2023-05-01T12:00:00.000Z",
      task: {
        id: "1",
        name: "Fixed Task",
        description: "A fixed task",
        color: "#FF0000",
        leisure: false,
        dependencies: [],
        nonce: 1,
        type: "fixed",
        start: "2023-05-01T10:00:00.000Z",
        end: "2023-05-01T12:00:00.000Z",
      },
    };

    const clientSlot = rawToClientSlot(rawSlot);
    expect(clientSlot).toEqual({
      start: parseISODate(rawSlot.start),
      end: parseISODate(rawSlot.end),
      task: rawToClientTask(rawSlot.task),
    });
  });
});
