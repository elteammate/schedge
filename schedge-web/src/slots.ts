import {Slot} from "./api.ts";
import {DateTime} from "luxon";

export type SlotChunk = Slot & {
    chunkStart: DateTime;
    chunkEnd: DateTime;
}

export function splitSlotIntoDays(slot: Slot): SlotChunk[] {
    const start = slot.start;
    const end = slot.end;
    const chunks: SlotChunk[] = [];

    let currentStart = start;

    while (currentStart < end) {
        const currentEnd = currentStart.endOf('day');
        chunks.push({
            ...slot,
            chunkStart: currentStart,
            chunkEnd: currentEnd > slot.end ? slot.end : currentEnd
        });
        currentStart = currentEnd.plus({milliseconds: 1});
    }

    return chunks;
}

export function slotsForDay(slots: Slot[], day: DateTime): SlotChunk[] {
    return slots.flatMap(slot => {
        const chunks = splitSlotIntoDays(slot);
        return chunks.filter(chunk =>
            chunk.chunkStart >= day.startOf('day') && chunk.chunkEnd <= day.endOf('day')
        );
    });
}
