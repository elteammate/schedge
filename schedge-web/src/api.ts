import {DateTime, Duration} from 'luxon';

export const API_BASE = import.meta.env.VITE_API_BASE_URL;

function throwErr<T>(e: any): T {
    throw e;
}

function parseISODate(s: string): DateTime {
    return DateTime.fromISO(s, {setZone: true}).toLocal();
}

function serializeDate(dt: DateTime): string {
    const iso = dt.toISO();
    if (!iso) {
        console.error("Failed to serialize DateTime:", dt);
        throwErr(new Error("Failed to serialize DateTime"));
    }
    return <string>iso;
}

function parseISODuration(s: string): Duration {
    return Duration.fromISO(s);
}

function serializeDuration(d: Duration): string {
    const iso = d.toISO();
    if (!iso) {
        console.error("Failed to serialize Duration:", d);
        throwErr(new Error("Failed to serialize Duration"));
    }
    return <string>iso;
}

type RawBaseTask = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    leisure: boolean;
    dependencies: string[];
    nonce: number;
};

type RawFixedTask = RawBaseTask & {
    type: 'fixed';
    start: string;
    end: string;
};

type RawContinuousTask = RawBaseTask & {
    type: 'continuous';
    duration: string;
    kickoff: string;
    deadline: string;
};

type RawProjectTask = RawBaseTask & {
    type: 'project';
    duration: string;
    kickoff: string;
    deadline: string;
    timings: {
        work: string;
        smallBreak: string;
        bigBreak: string;
        numberOfSmallBreaks: number;
    };
};

export type RawTask = RawFixedTask | RawContinuousTask | RawProjectTask;

export type RawSlot = {
    start: string;
    end: string;
    task: RawTask;
};

export type RawState = {
    userId: number;
    tasks: RawTask[];
    slots: RawSlot[];
}

export type ApiResponse<T> =
    | { status: 'ok'; result: T }
    | { status: 'error'; message: string };

export type BaseTask = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    leisure: boolean;
    dependencies: string[];
    nonce: number;
};

export type FixedTask = BaseTask & {
    type: 'fixed';
    start: DateTime;
    end: DateTime;
};

export type ContinuousTask = BaseTask & {
    type: 'continuous';
    duration: Duration;
    kickoff: DateTime;
    deadline: DateTime;
};

export type ProjectTask = BaseTask & {
    type: 'project';
    duration: Duration;
    kickoff: DateTime;
    deadline: DateTime;
    timings: {
        work: Duration;
        smallBreak: Duration;
        bigBreak: Duration;
        numberOfSmallBreaks: number;
    };
};

export type Task = FixedTask | ContinuousTask | ProjectTask;
export type Slot = { start: DateTime; end: DateTime; task: Task };

export type State = {
    tasks: Task[];
    slots: Slot[];
    userId: number;
}

function rawToClientTask(rt: RawTask): Task {
    const base: BaseTask = {
        id: rt.id,
        name: rt.name,
        description: rt.description,
        color: rt.color,
        leisure: rt.leisure,
        dependencies: rt.dependencies,
        nonce: rt.nonce,
    };

    if (rt.type === 'fixed') {
        return {
            ...base,
            type: 'fixed',
            start: parseISODate(rt.start),
            end: parseISODate(rt.end),
        };
    } else if (rt.type === 'continuous') {
        return {
            ...base,
            type: 'continuous',
            duration: parseISODuration(rt.duration),
            kickoff: parseISODate(rt.kickoff),
            deadline: parseISODate(rt.deadline),
        };
    } else {
        return {
            ...base,
            type: 'project',
            duration: parseISODuration(rt.duration),
            kickoff: parseISODate(rt.kickoff),
            deadline: parseISODate(rt.deadline),
            timings: {
                work: parseISODuration(rt.timings.work),
                smallBreak: parseISODuration(rt.timings.smallBreak),
                bigBreak: parseISODuration(rt.timings.bigBreak),
                numberOfSmallBreaks: rt.timings.numberOfSmallBreaks,
            },
        };
    }
}

function clientToRawTask(t: Task): RawTask {
    const base = {
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        leisure: t.leisure,
        dependencies: t.dependencies,
        nonce: t.nonce,
    };

    if (t.type === 'fixed') {
        return {
            ...base,
            type: 'fixed',
            start: serializeDate(t.start),
            end: serializeDate(t.end),
        };
    } else if (t.type === 'continuous') {
        return {
            ...base,
            type: 'continuous',
            duration: serializeDuration(t.duration),
            kickoff: serializeDate(t.kickoff),
            deadline: serializeDate(t.deadline),
        };
    } else {
        return {
            ...base,
            type: 'project',
            duration: serializeDuration(t.duration),
            kickoff: serializeDate(t.kickoff),
            deadline: serializeDate(t.deadline),
            timings: {
                work: serializeDuration(t.timings.work),
                smallBreak: serializeDuration(t.timings.smallBreak),
                bigBreak: serializeDuration(t.timings.bigBreak),
                numberOfSmallBreaks: t.timings.numberOfSmallBreaks,
            },
        };
    }
}

function rawToClientSlot(raw: RawSlot): Slot {
    return {
        start: parseISODate(raw.start),
        end: parseISODate(raw.end),
        task: rawToClientTask(raw.task),
    };
}

const api = {
    async getTasks(userId: number): Promise<Task[]> {
        const res: Response = await fetch(`${API_BASE}/api/v0/user/${userId}/task`).catch(e => throwErr(new Error(e)));
        const body = (await res.json()) as ApiResponse<RawTask[]>;
        if (body.status !== 'ok') throw new Error(body.message);
        return body.result.map(rawToClientTask);
    },

    async getTask(userId: number, taskId: string): Promise<Task> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/task/${taskId}`);
        const body = (await res.json()) as ApiResponse<RawTask>;
        if (body.status !== 'ok') throw new Error(body.message);
        return rawToClientTask(body.result);
    },

    async createTask(userId: number, task: Task): Promise<Task> {
        const raw = clientToRawTask(task);
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/task`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(raw),
        });
        const body = (await res.json()) as ApiResponse<RawTask>;
        if (body.status !== 'ok') throw new Error(body.message);
        return rawToClientTask(body.result);
    },

    async updateTask(
        userId: number,
        task: Task,
    ): Promise<Task> {
        const raw = clientToRawTask(task);
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/task/${task.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(raw),
        });
        const body = (await res.json()) as ApiResponse<RawTask>;
        if (body.status !== 'ok') throw new Error(body.message);
        return rawToClientTask(body.result);
    },

    async deleteTask(
        userId: number,
        taskId: string,
    ): Promise<void> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/task/${taskId}`, {
            method: 'DELETE',
        });
        const body = (await res.json()) as ApiResponse<RawTask>;
        if (body.status !== 'ok') throw new Error(body.message);
    },

    async postQueue(
        userId: number,
        queue: number[],
    ): Promise<number[]> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/queue`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(queue),
        });
        const body = (await res.json()) as ApiResponse<number[]>;
        if (body.status !== 'ok') throw new Error(body.message);
        return body.result;
    },

    async getSlots(userId: number): Promise<Slot[]> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/slot`);
        const body = (await res.json()) as ApiResponse<RawSlot[]>;
        if (body.status !== 'ok') throw new Error(body.message);
        return body.result.map(rawToClientSlot);
    },

    rawStateToState(raw: RawState): State {
        return {
            tasks: raw.tasks.map(rawToClientTask),
            slots: raw.slots.map(rawToClientSlot),
            userId: raw.userId,
        };
    },

    async getState(userId: number): Promise<State> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/state`);
        const body = (await res.json()) as ApiResponse<RawState>;
        if (body.status !== 'ok') throw new Error(body.message);
        return this.rawStateToState(body.result);
    },

    async enqueueScheduling(userId: number): Promise<void> {
        const res = await fetch(`${API_BASE}/api/v0/user/${userId}/compute_slot_request`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({}),
        });
        const body = (await res.json()) as ApiResponse<void>;
        if (body.status !== 'ok') throw new Error(body.message);
    }
};

// For testing
export {
    rawToClientTask,
    clientToRawTask,
    rawToClientSlot,
    parseISODate,
    serializeDate,
    parseISODuration,
    serializeDuration,
};

export default api;
