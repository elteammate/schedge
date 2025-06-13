import {DateTime, Duration} from "luxon";
import {createEffect, createSignal, Index, Show} from "solid-js";

export function InputField(props: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <Show when={props.label}>
                <label class="text-gray-200 text-sm">{props.label}</label>
            </Show>
            <input
                type="text"
                class="border rounded-lg p-2 w-full bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={props.value}
                onInput={(e) => {
                    props.onChange(e.currentTarget.value);
                    e.stopPropagation();
                }}
                onClick={e => e.stopPropagation()}
                placeholder={props.placeholder || "Enter value"}
            />
        </div>
    );
}

export function TimePicker(props: {
    value: DateTime;
    label?: string;
    onChange?: (value: DateTime) => void;
}) {
    return <div>
        <Show when={props.label}>
            <label class="text-gray-200 text-sm">{props.label}</label>
        </Show>
        <div class="flex">
            <input
                type="time"
                class="shrink-0 rounded-none rounded-s-lg bg-gray-50 border text-gray-900 leading-none focus:ring-blue-500 focus:border-blue-500 block text-sm border-gray-300 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                value={`${props.value.hour.toString().padStart(2, '0')}:${props.value.minute.toString().padStart(2, '0')}`}
                min="00:00"
                max="23:59"
                onChange={e => {
                    const [hour, minute] = e.currentTarget.value.split(':').map(Number);
                    const newValue = props.value.set({hour, minute});
                    props.onChange?.(newValue);
                }}
                required/>
            <input
                type="date"
                class="shrink-0 rounded-none rounded-e-lg bg-gray-50 border text-gray-900 leading-none focus:ring-blue-500 focus:border-blue-500 block text-sm border-gray-300 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                value={props.value.toFormat("yyyy-MM-dd")}
                onChange={e => {
                    const date = DateTime.fromISO(e.currentTarget.value);
                    const newValue = props.value.set({
                        year: date.year,
                        month: date.month,
                        day: date.day
                    });
                    props.onChange?.(newValue);
                }}
            />
        </div>
    </div>;
}

export function DurationPicker(props: {
    value: Duration;
    label?: string;
    onChange?: (value: Duration) => void;
}) {
    const [data, setData] = createSignal("");

    createEffect(() => {
        setData(props.value.toFormat("hh:mm"));
    });

    return <div>
        <Show when={props.label}>
            <label class="text-gray-200 text-sm">{props.label}</label>
        </Show>
        <input
            type="text"
            class="border rounded-lg p-2 w-full bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="\d{2}:\d{2}"
            value={data()}
            onInput={e => {
                setData(e.currentTarget.value);
            }}
            onFocusOut={e => {
                const value = e.currentTarget.value;
                const parts = value.split(':').map(Number);
                if (parts.length === 1 && !isNaN(parts[0])) {
                    const newValue = Duration.fromObject({hours: parts[0]});
                    props.onChange?.(newValue);
                    setData(newValue.toFormat("hh:mm"));
                    return;
                } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const newValue = Duration.fromObject({hours: parts[0], minutes: parts[1]});
                    props.onChange?.(newValue);
                } else {
                    setData(props.value.toFormat("hh:mm"));
                }
            }}
            required/>
    </div>;
}

export function Selector(props: {
    options: any[];
    value: number;
    onChange: (option: number) => void;
    label?: string;
}) {
    return (
        <div>
            <Show when={props.label}>
                <label class="text-gray-200 text-sm">{props.label}</label>
            </Show>
            <div class="flex">
                <Index each={props.options}>
                    {(option, index) => (
                        <button
                            class={`
                                flex-1 text-center
                                ${index == 0 ? 'rounded-s-lg' : ''}
                                ${index == props.options.length - 1 ? 'rounded-e-lg' : ''}
                                shrink-0 rounded-none border
                                text-gray-900 leading-none focus:ring-blue-500 focus:border-blue-500
                                block text-sm border-gray-300 p-2.5 dark:border-gray-600 
                                dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500
                                ${props.value === index ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-100 hover:bg-blue-600'}`}
                            onClick={() => props.onChange(index)}
                        >
                            {option()}
                        </button>
                    )}
                </Index>
            </div>
        </div>
    );
}

export function Button(props: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            class={`bg-blue-500 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={props.onClick}
            disabled={props.disabled}
        >
            {props.label}
        </button>
    );
}

export function Checkbox(props: {
    label: string;
    checked: boolean;
    onChange?: (checked: boolean) => void;
}) {
    return (
        <div class="flex items-center mb-4">
            <input
                value={props.checked ? "on" : "off"}
                onChange={e => {
                    props.onChange?.(e.currentTarget.checked);
                }}
                id="default-checkbox" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
            <label for="default-checkbox" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">{props.label}</label>
        </div>
    );
}
