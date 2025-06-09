import {createSignal, For, Show} from "solid-js";
import {PrimaryState} from "./App.tsx";
import { Task } from "./api.ts";
import {ChevronDown, ChevronUp, Pencil} from "lucide-solid";
import {Duration} from "luxon";

const formatDuration = (duration: Duration) => duration.toFormat("hh:mm:ss");

function TaskItem(props: { task: Task }) {
    const [expanded, setExpanded] = createSignal(false);
    const [editing, setEditing] = createSignal(false);

    return (
        <div
            class="border rounded-2xl p-4 shadow-sm mb-2 cursor-pointer bg-white hover:shadow-md transition"
            style={{ borderLeft: `4px solid ${props.task.color}` }}
            onClick={() => setExpanded(!expanded())}
        >
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold">{props.task.name}</h3>
                    <Show when={expanded()}>
                        <p class="text-sm text-gray-600 mt-1">
                            {props.task.description || "No description"}
                        </p>
                    </Show>
                </div>
                <div class="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditing(!editing());
                        }}
                        class="text-gray-500 hover:text-gray-800"
                    >
                        <Pencil class="w-4 h-4" />
                    </button>
                    <Show when={expanded()}>
                        <ChevronUp class="w-4 h-4" />
                    </Show>
                    <Show when={!expanded()}>
                        <ChevronDown class="w-4 h-4" />
                    </Show>
                </div>
            </div>

            <Show when={expanded()}>
                <div class="mt-3 text-sm text-gray-700 space-y-1">
                    <div>Type: {props.task.type}</div>
                    <Show when={props.task.type === "fixed"}>
                        <div>
                            Time: {(props.task as any).start.toISO()} - {(props.task as any).end.toISO()}
                        </div>
                    </Show>
                    <Show when={props.task.type === "continuous" || props.task.type === "project"}>
                        <div>
                            Duration: {formatDuration((props.task as any).duration)}
                        </div>
                        <div>
                            Window: {(props.task as any).kickoff.toISO()} - {(props.task as any).deadline.toISO()}
                        </div>
                    </Show>
                    <Show when={props.task.type === "project"}>
                        <div>
                            Timings: work {formatDuration((props.task as any).timings.work)}, small break {formatDuration((props.task as any).timings.smallBreak)}, big break {formatDuration((props.task as any).timings.bigBreak)}, small breaks: {(props.task as any).timings.numberOfSmallBreaks}
                        </div>
                    </Show>
                </div>

                <Show when={editing()}>
                    <div class="mt-4 p-2 border rounded bg-gray-50">
                        <label class="block mb-1 text-sm font-medium">Name</label>
                        <input
                            type="text"
                            value={props.task.name}
                            class="w-full p-1 border rounded"
                        />
                        <label class="block mb-1 mt-2 text-sm font-medium">Description</label>
                        <textarea
                            class="w-full p-1 border rounded"
                            value={props.task.description || ""}
                        />
                        {/* Add more editable fields as needed */}
                    </div>
                </Show>
            </Show>
        </div>
    );
}

function TaskList(props: {
    state: PrimaryState,
}) {
    return <div class="p-4">
        <h2 class="text-xl font-bold mb-4">Tasks</h2>
        <For each={props.state.tasks}>{(task) => <TaskItem task={task} />}</For>
    </div>
}

export default TaskList;
