import {createEffect, createSignal, For, Match, Show, Switch} from "solid-js";
import {PrimaryState} from "./App.tsx";
import {createTask, Task, updateTask} from "./api.ts";
import {ChevronDown, ChevronUp, CloudCheck, CloudCog} from "lucide-solid";
import {DateTime, Duration} from "luxon";
import {userId} from "./userStore.ts";
import {DurationPicker, InputField, Selector, TimePicker, Button} from "./components.tsx";

type EditableTask = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    leisure: boolean;
    dependencies: number[];
    nonce: number;
    type: 'fixed' | 'continuous' | 'project';
    start: DateTime;
    end: DateTime;
    duration: Duration;
    kickoff: DateTime;
    deadline: DateTime;
    timings: {
        work: Duration;
        smallBreak: Duration;
        bigBreak: Duration;
        numberOfSmallBreaks: number;
    };
}

const taskFromEditableTask = (editable: EditableTask): Task => {
    if (editable.type === 'fixed') {
        return {
            id: editable.id,
            name: editable.name,
            description: editable.description,
            color: editable.color,
            leisure: editable.leisure,
            dependencies: editable.dependencies,
            nonce: editable.nonce,
            type: 'fixed',
            start: editable.start,
            end: editable.end,
        };
    } else if (editable.type === 'continuous') {
        return {
            id: editable.id,
            name: editable.name,
            description: editable.description,
            color: editable.color,
            leisure: editable.leisure,
            dependencies: editable.dependencies,
            nonce: editable.nonce,
            type: 'continuous',
            duration: editable.duration,
            kickoff: editable.kickoff,
            deadline: editable.deadline,
        };
    } else if (editable.type === 'project') {
        return {
            id: editable.id,
            name: editable.name,
            description: editable.description,
            color: editable.color,
            leisure: editable.leisure,
            dependencies: editable.dependencies,
            nonce: editable.nonce,
            type: 'project',
            duration: editable.duration,
            kickoff: editable.kickoff,
            deadline: editable.deadline,
            timings: editable.timings
        };
    }
    throw new Error("Unknown task type");
};

const editableTaskFromTask = (task: Task): EditableTask => {
    return {
        id: task.id,
        name: task.name,
        description: task.description,
        color: task.color,
        leisure: task.leisure,
        dependencies: task.dependencies,
        nonce: task.nonce,
        type: task.type,
        start: task.type === 'fixed' ? task.start : DateTime.now(),
        end: task.type === 'fixed' ? task.end : DateTime.now(),
        duration: task.type === 'continuous' || task.type === 'project' ? task.duration : Duration.fromMillis(60 * 60 * 1000),
        kickoff: task.type === 'continuous' || task.type === 'project' ? task.kickoff : DateTime.now(),
        deadline: task.type === 'continuous' || task.type === 'project' ? task.deadline : DateTime.now(),
        timings: task.type === 'project' ? task.timings : {
            work: Duration.fromMillis(25 * 60 * 1000),
            smallBreak: Duration.fromMillis(5 * 60 * 1000),
            bigBreak: Duration.fromMillis(20 * 60 * 1000),
            numberOfSmallBreaks: 4,
        }
    };
};

function TaskItem(props: { task: Task }) {
    type EditTarget = "name" | "description" | "start" | "end" | "kickoff" | "deadline" | "timings" | "duration";

    const [expanded, setExpanded] = createSignal(false);
    const [unsyncedTask, setUnsyncedTask] = createSignal<EditableTask>(editableTaskFromTask(props.task));
    const [editTarget, setEditTarget] = createSignal<EditTarget | null>(null);
    const editedTask = () => taskFromEditableTask(unsyncedTask());
    const taskSynced = () => unsyncedTask().nonce === props.task.nonce;
    const [_syncTimeout, setSyncTimeout] = createSignal<number | null>(null);

    createEffect(() => {
        if (!taskSynced()) {
            setSyncTimeout(timeout => {
                if (timeout !== null) {
                    clearTimeout(timeout);
                }
                return setTimeout(() => {
                    const task = editedTask();
                    updateTask(userId(), task).then();
                    setSyncTimeout(null);
                }, 1000);
            });
        } else {
            setSyncTimeout(timeout => {
                if (timeout !== null) {
                    clearTimeout(timeout);
                }
                return null;
            });
        }
    });

    /*
    createEffect(() => {
        const task = props.task;
        const editTargetI = editTarget();
        setUnsyncedTask(t => ({
            name: editTargetI === "name" ? t.name : task.name,
            description: editTargetI === "description" ? t.description : task.description,
            color: task.color,
            leisure: task.leisure,
            dependencies: task.dependencies,
            type: task.type,
            start: editTargetI === "start" ? t.start : task.type === 'fixed' ? task.start : DateTime.now(),
            end: editTargetI === "end" ? t.end : task.type === 'fixed' ? task.end : DateTime.now(),
            duration: editTargetI === "duration" ? t.duration : task.type === 'continuous' || task.type === 'project' ? task.duration : Duration.fromMillis(60 * 60 * 1000),
            kickoff: editTargetI === "kickoff" ? t.kickoff : task.type === 'continuous' || task.type === 'project' ? task.kickoff : DateTime.now(),
            deadline: editTargetI === "deadline" ? t.deadline : task.type === 'continuous' || task.type === 'project' ? task.deadline : DateTime.now(),
            timings: editTargetI === "timings" ? t.timings : task.type === 'project' ? task.timings : {
                work: Duration.fromMillis(25 * 60 * 1000),
                smallBreak: Duration.fromMillis(5 * 60 * 1000),
                bigBreak: Duration.fromMillis(20 * 60 * 1000),
                numberOfSmallBreaks: 4,
            },
            id: task.id,
        }));
    });
     */

    createEffect(() => {
        if (!expanded()) {
            setEditTarget(null);
        }
    });

    const updateTask = (updates: Partial<EditableTask>) => {
        setUnsyncedTask(t => ({
            ...t,
            ...updates,
            nonce: t.nonce + 1,
        }));
    }

    return (
        <div
            class="border rounded-2xl p-4 shadow-sm mb-2 cursor-pointer bg-gray-800 hover:shadow-md transition border-gray-700 dark:bg-gray-800 dark:border-gray-700"
            onClick={() => setExpanded(!expanded())}
        >
            <form class="flex justify-between items-center"
                  onSubmit={e => {
                      e.preventDefault();
                      setEditTarget(null);
                  }}>
                <div class="w-full">
                    <Show when={editTarget() === "name"}>
                        <InputField
                            value={unsyncedTask().name}
                            onChange={(value) => updateTask({ name: value })}/>
                    </Show>
                    <Show when={editTarget() !== "name"}>
                        <h3 class="text-lg font-semibold text-gray-100"
                            onClick={e => {
                                setEditTarget("name");
                                e.stopPropagation();
                            }}>
                            {unsyncedTask().name}
                        </h3>
                    </Show>
                    <Show when={!expanded()}>
                        <div class="max-w-xs truncate text-sm text-gray-400">
                            {unsyncedTask().description || "No description"}
                        </div>
                    </Show>
                    <Show when={expanded()}>
                        <Show when={editTarget() !== "description"}>
                            <div
                                class="text-sm text-gray-400"
                                onClick={e => {
                                    setEditTarget("description");
                                    e.stopPropagation();
                                }}>
                                {unsyncedTask().description || "No description"}
                            </div>
                        </Show>
                        <Show when={editTarget() === "description"}>
                            <InputField
                                value={unsyncedTask().description || ""}
                                onChange={(value) => updateTask({ description: value })}
                                placeholder="Enter task description"/>
                        </Show>
                    </Show>
                </div>
                <div class="flex gap-2 flex-col">
                    <Show when={expanded()}>
                        <ChevronUp class="w-4 h-4 text-gray-400"/>
                    </Show>
                    <Show when={!expanded()}>
                        <ChevronDown class="w-4 h-4 text-gray-400"/>
                    </Show>
                    <Show when={taskSynced()}>
                        <CloudCheck class="w-5 h-5 text-gray-400"/>
                    </Show>
                    <Show when={!taskSynced()}>
                        <CloudCog class="w-5 h-5 text-gray-200 shadow-2xs animate-pulse"/>
                    </Show>
                </div>
            </form>

            <div
                onClick={e => e.stopPropagation()}
                class="flex flex-col gap-2 mt-2">
                <Show when={expanded()}>
                    <Selector
                        options={["Fixed", "Continuous", "Project"]}
                        value={["fixed", "continuous", "project"].indexOf(unsyncedTask().type)}
                        onChange={i => updateTask({ type: ["fixed", "continuous", "project"][i] as any })}/>

                    <Switch>
                        <Match when={unsyncedTask().type === "fixed"}>
                            <TimePicker
                                value={unsyncedTask().start}
                                label="Start:"
                                onChange={d => updateTask({ start: d })}/>
                            <TimePicker
                                value={unsyncedTask().end}
                                label="End:"
                                onChange={d => updateTask({ end: d })}/>
                        </Match>
                        <Match when={unsyncedTask().type === "continuous"}>
                            <TimePicker
                                value={unsyncedTask().kickoff}
                                label="Kickoff:"
                                onChange={d => updateTask({ kickoff: d })}/>
                            <TimePicker
                                value={unsyncedTask().deadline}
                                label="Deadline:"
                                onChange={d => updateTask({ deadline: d })}/>
                            <DurationPicker
                                value={unsyncedTask().duration}
                                label="Duration:"
                                onChange={d => updateTask({ duration: d })}/>
                        </Match>
                        <Match when={unsyncedTask().type === "project"}>
                            <TimePicker
                                value={unsyncedTask().kickoff}
                                label="Kickoff:"
                                onChange={d => updateTask({ kickoff: d })}/>
                            <TimePicker
                                value={unsyncedTask().deadline}
                                label="Deadline:"
                                onChange={d => updateTask({ deadline: d })}/>
                            <DurationPicker
                                value={unsyncedTask().duration}
                                label="Total Duration:"
                                onChange={d => updateTask({ duration: d })}/>
                            <DurationPicker
                                value={unsyncedTask().timings.work}
                                label="Work Duration:"
                                onChange={d => updateTask({
                                    timings: { ...unsyncedTask().timings, work: d }
                                })}/>
                            <DurationPicker
                                value={unsyncedTask().timings.smallBreak}
                                label="Small Break Duration:"
                                onChange={d => updateTask({
                                    timings: { ...unsyncedTask().timings, smallBreak: d }
                                })}/>
                            <DurationPicker
                                value={unsyncedTask().timings.bigBreak}
                                label="Big Break Duration:"
                                onChange={d => updateTask({
                                    timings: { ...unsyncedTask().timings, bigBreak: d }
                                })}/>
                            <InputField
                                value={`${unsyncedTask().timings.numberOfSmallBreaks}`}
                                onChange={(value) => {
                                    const num = parseInt(value);
                                    if (!isNaN(num)) {
                                        updateTask({
                                            timings: { ...unsyncedTask().timings, numberOfSmallBreaks: num }
                                        });
                                    }}
                                }
                                placeholder="Number of Small Breaks"/>
                        </Match>
                    </Switch>
                </Show>
            </div>
        </div>
    );
}

function TaskList(props: {
    state: PrimaryState,
}) {
    return <div class="p-4 bg-gray-900 text-gray-100 h-full overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 w-full text-center">Your tasks</h2>
        <div class="flex w-full justify-center mb-4">
            <Button label="Add task" onClick={() => {
                createTask(userId(), ({
                    id: 0,
                    name: "New Task",
                    description: null,
                    color: "#4A90E2",
                    leisure: false,
                    dependencies: [],
                    type: 'fixed',
                    start: DateTime.now().startOf('hour').plus({hours: 1}),
                    end: DateTime.now().plus({hours: 2}),
                    nonce: 1,
                })).then(task => {
                    props.state.tasks.push(task);
                }).catch(err => {
                    console.error("Failed to create task:", err);
                });
            }}/>
        </div>
        <For each={props.state.tasks}>
            {(task) => <TaskItem task={task}/>}
        </For>
    </div>
}

export default TaskList;
