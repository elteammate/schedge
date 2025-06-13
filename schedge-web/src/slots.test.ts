import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { splitSlotIntoDays } from './slots';
import { Slot, Task } from './api';

describe('splitSlotIntoDays', () => {
  it('should handle a slot within a single day', () => {
    const slot: Slot = {
      task: <Task>{ id: '1' },
      start: DateTime.fromISO('2023-05-01T10:00:00'),
      end: DateTime.fromISO('2023-05-01T14:00:00'),
    };

    const result = splitSlotIntoDays(slot);
    expect(result.length).toBe(1);

    // Ensure start and end are unchanged
    expect(result[0].start.toISO()).toBe(slot.start.toISO());
    expect(result[0].end.toISO()).toBe(slot.end.toISO());

    // Ensure chunkStart and chunkEnd are correct
    expect(result[0].chunkStart.toISO()).toBe(slot.start.toISO());
    expect(result[0].chunkEnd.toISO()).toBe(slot.end.toISO());

    expect(result[0].task).toBe(slot.task);
  });

  it('should split a slot into two days', () => {
    const slot: Slot = {
      task: <Task>{ id: '1' },
      start: DateTime.fromISO('2023-05-01T10:00:00'),
      end: DateTime.fromISO('2023-05-02T14:00:00'),
    };

    const result = splitSlotIntoDays(slot);
    expect(result.length).toBe(2);

    // Ensure start and end are unchanged
    expect(result[0].start.toISO()).toBe(slot.start.toISO());
    expect(result[0].end.toISO()).toBe(slot.end.toISO());
    expect(result[1].start.toISO()).toBe(slot.start.toISO());
    expect(result[1].end.toISO()).toBe(slot.end.toISO());

    // Ensure chunkStart and chunkEnd are correct
    expect(result[0].chunkStart.toISO()).toBe(slot.start.toISO());
    expect(result[0].chunkEnd.toISO()).toBe(slot.start.endOf('day').toISO());
    expect(result[1].chunkStart.toISO()).toBe(slot.end.startOf('day').toISO());
    expect(result[1].chunkEnd.toISO()).toBe(slot.end.toISO());

    expect(result[0].task).toBe(slot.task);
    expect(result[1].task).toBe(slot.task);
  });

  it('should split a slot into three days', () => {
    const slot: Slot = {
      task: <Task>{ id: '1' },
      start: DateTime.fromISO('2023-05-01T10:00:00'),
      end: DateTime.fromISO('2023-05-03T14:00:00'),
    };

    const result = splitSlotIntoDays(slot);
    expect(result.length).toBe(3);

    // Ensure start and end are unchanged
    expect(result[0].start.toISO()).toBe(slot.start.toISO());
    expect(result[0].end.toISO()).toBe(slot.end.toISO());
    expect(result[1].start.toISO()).toBe(slot.start.toISO());
    expect(result[1].end.toISO()).toBe(slot.end.toISO());
    expect(result[2].start.toISO()).toBe(slot.start.toISO());
    expect(result[2].end.toISO()).toBe(slot.end.toISO());

    // Ensure chunkStart and chunkEnd are correct
    expect(result[0].chunkStart.toISO()).toBe(slot.start.toISO());
    expect(result[0].chunkEnd.toISO()).toBe(slot.start.endOf('day').toISO());
    const middleDay = slot.start.plus({ days: 1 });
    expect(result[1].chunkStart.toISO()).toBe(middleDay.startOf('day').toISO());
    expect(result[1].chunkEnd.toISO()).toBe(middleDay.endOf('day').toISO());
    expect(result[2].chunkStart.toISO()).toBe(slot.end.startOf('day').toISO());
    expect(result[2].chunkEnd.toISO()).toBe(slot.end.toISO());
  });

  it('should handle a slot that spans part of a day', () => {
    const slot: Slot = {
      task: <Task>{ id: '1' },
      start: DateTime.fromISO('2023-05-01T23:00:00'),
      end: DateTime.fromISO('2023-05-02T01:00:00'),
    };

    const result = splitSlotIntoDays(slot);
    expect(result.length).toBe(2);

    // Ensure start and end are unchanged
    expect(result[0].start.toISO()).toBe(slot.start.toISO());
    expect(result[0].end.toISO()).toBe(slot.end.toISO());
    expect(result[1].start.toISO()).toBe(slot.start.toISO());
    expect(result[1].end.toISO()).toBe(slot.end.toISO());

    // Ensure chunkStart and chunkEnd are correct
    expect(result[0].chunkStart.toISO()).toBe(slot.start.toISO());
    expect(result[0].chunkEnd.toISO()).toBe(slot.start.endOf('day').toISO());
    expect(result[1].chunkStart.toISO()).toBe(slot.end.startOf('day').toISO());
    expect(result[1].chunkEnd.toISO()).toBe(slot.end.toISO());
  });

  it('should handle a slot that already starts and ends at day boundaries', () => {
    const slot: Slot = {
      task: <Task>{ id: '1' },
      start: DateTime.fromISO('2023-05-01T00:00:00.000'),
      end: DateTime.fromISO('2023-05-03T23:59:59.999'),
    };

    const result = splitSlotIntoDays(slot);
    expect(result.length).toBe(3);

    // Ensure start and end are unchanged
    expect(result[0].start.toISO()).toBe(slot.start.toISO());
    expect(result[0].end.toISO()).toBe(slot.end.toISO());
    expect(result[1].start.toISO()).toBe(slot.start.toISO());
    expect(result[1].end.toISO()).toBe(slot.end.toISO());
    expect(result[2].start.toISO()).toBe(slot.start.toISO());
    expect(result[2].end.toISO()).toBe(slot.end.toISO());

    // Ensure chunkStart and chunkEnd are correct
    expect(result[0].chunkStart.toISO()).toBe(slot.start.toISO());
    expect(result[0].chunkEnd.toISO()).toBe(slot.start.endOf('day').toISO());
    const middleDay = slot.start.plus({ days: 1 });
    expect(result[1].chunkStart.toISO()).toBe(middleDay.startOf('day').toISO());
    expect(result[1].chunkEnd.toISO()).toBe(middleDay.endOf('day').toISO());
    expect(result[2].chunkStart.toISO()).toBe(slot.end.startOf('day').toISO());
    expect(result[2].chunkEnd.toISO()).toBe(slot.end.toISO());
  });
});
