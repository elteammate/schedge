import {createSignal, For, createEffect, Show} from "solid-js";
import {PrimaryState} from "./App.tsx";
import {DateTime} from "luxon";
import {SlotChunk, slotsForDay, splitSlotIntoDays} from "./slots.ts";

function TimeSlot(
    props: {
        slot: SlotChunk,
    },
) {
    const start = props.slot.start.toLocaleString(DateTime.TIME_SIMPLE);
    const end = props.slot.end.toLocaleString(DateTime.TIME_SIMPLE);
    console.log('Rendering TimeSlot', start, end, props.slot.task.name);
    return (
        <div
            class="absolute w-full bg-blue-800 text-gray-200 p-3 text-xs overflow-hidden rounded-sm border-gray-300 border-2"
            style={{
                top: `${(props.slot.chunkStart.hour * 60 + props.slot.chunkStart.minute) / 1440 * 100}%`,
                height: `${(
                    props.slot.chunkEnd.hour * 60 + props.slot.chunkEnd.minute - 
                    (props.slot.chunkStart.hour * 60 + props.slot.chunkStart.minute)) / 1440 * 100}%`,
            }}
            >
            {props.slot.task.name}
            <div>
                ({start} - {end})
            </div>
        </div>
    );
}

function WeekCalendar(props: {
    state: PrimaryState,
}) {
    const [currentWeek, setCurrentWeek] = createSignal(DateTime.now().startOf('week'));

    const days = () => Array.from({length: 7}, (_, i) => currentWeek().plus({days: i}));

    const incrementWeek = () => {
        setCurrentWeek(currentWeek().plus({weeks: 1}));
    };

    const decrementWeek = () => {
        setCurrentWeek(currentWeek().minus({weeks: 1}));
    };

    const slots = () => props.state.slots.flatMap(slot => splitSlotIntoDays(slot));

    const [currentTimePosition, setCurrentTimePosition] = createSignal<{
        percentage: number,
        day: number
    } | null>(null);

    createEffect(() => {
        const updateCurrentTimePosition = () => {
            const now = DateTime.now();
            const currentDay = days().find(day => now >= day.startOf('day') && now <= day.endOf('day'));

            if (currentDay) {
                const dayStart = currentDay.startOf('day');
                const dayEnd = currentDay.endOf('day');
                const totalDayDuration = dayEnd.diff(dayStart);
                const currentTimeDiff = now.diff(dayStart);
                const timePercentage = (currentTimeDiff.toMillis() / totalDayDuration.toMillis()) * 100;
                setCurrentTimePosition({
                    percentage: timePercentage,
                    day: currentDay.day
                });
            } else {
                setCurrentTimePosition(null);
            }
        };

        updateCurrentTimePosition();
        const intervalId = setInterval(updateCurrentTimePosition, 60000);

        return () => clearInterval(intervalId);
    });

    return (
        <div class="flex flex-col bg-gray-800 text-gray-100 h-screen">
            <div class="flex justify-between items-center p-4">
                <button onClick={decrementWeek}
                        class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Previous
                </button>
                <h2 class="text-xl font-bold">
                    {currentWeek().toLocaleString({month: 'long', year: 'numeric'})}
                </h2>
                <button onClick={incrementWeek}
                        class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Next
                </button>
            </div>

            <div class="flex overflow-y-scroll">
                <For each={days()}>
                    {(day, index) => (
                        <div style={{height: '400dvh'}}
                             class={`flex flex-col flex-1 border-r border-gray-700 relative ${index() === 0 ? 'border-l' : ''}`}>
                            <div class="p-2 text-center border-b border-gray-700">
                                {day.toLocaleString({weekday: 'long'})}
                                <br/>
                                {day.toLocaleString({month: 'short', day: 'numeric'})}
                            </div>
                            <div class="h-full relative">
                                <For each={slotsForDay(slots(), day)}>
                                    {(slot) => (
                                        <TimeSlot slot={slot} />
                                    )}
                                </For>
                                <Show when={currentTimePosition() !== null && currentTimePosition()?.day === day.day}>
                                    <div
                                        class="absolute bg-red-500 h-[2px] w-full shadow-red-500"
                                        style={{
                                            top: `${currentTimePosition()?.percentage}%`,
                                        }}
                                    />
                                </Show>
                                <For each={Array.from({length: 24}, (_, i) => i)}>
                                    {(hour) => (
                                        <>
                                            <div
                                                class="absolute w-full h-[1px] bg-gray-600"
                                                style={{
                                                    top: `${(hour / 24) * 100}%`,
                                                }}
                                            />
                                            <Show when={day.weekday === 1}>
                                                <div
                                                    class="absolute text-xs text-gray-400"
                                                    style={{
                                                        top: `${(hour / 24) * 100}%`,
                                                        left: '2px',
                                                    }}
                                                >
                                                    {DateTime.fromObject({hour}).toLocaleString(DateTime.TIME_SIMPLE)}
                                                </div>
                                            </Show>
                                        </>
                                    )}
                                </For>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}

export default WeekCalendar;
