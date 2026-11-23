<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { dayKey, type CalendarRange } from "$lib/domain/days";

  let {
    applied,
    availableDates,
    onselect,
    ondraftchange,
  }: {
    applied: CalendarRange | null;
    availableDates: string[];
    onselect: (range: CalendarRange) => void;
    ondraftchange: (pending: boolean) => void;
  } = $props();

  const id = $props.id();
  const months = Array.from({ length: 12 }, (_, month) =>
    new Date(2024, month, 1).toLocaleDateString(undefined, { month: "long" }),
  );
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const available = $derived(new Set(availableDates));
  const years = $derived([
    ...new Set(availableDates.map((day) => Number(day.slice(0, 4)))),
  ]);
  const availableMonths = $derived([
    ...new Set(availableDates.map((day) => day.slice(0, 7))),
  ]);
  let popup: HTMLElement;
  let trigger: HTMLButtonElement;
  let draft = $state("");
  let focused = $state(new Date());
  const year = $derived(focused.getFullYear());
  const month = $derived(focused.getMonth());
  const monthIndex = $derived(
    availableMonths.indexOf(dayKey(focused).slice(0, 7)),
  );
  const first = $derived(calendarDate(year, month, 1));
  const offset = $derived((first.getDay() + 6) % 7);
  const days = $derived(
    Array.from(
      { length: calendarDate(year, month + 1, 0).getDate() },
      (_, index) => calendarDate(year, month, index + 1),
    ),
  );

  onDestroy(() => {
    if (draft) ondraftchange(false);
  });

  function calendarDate(year: number, month: number, day: number) {
    const date = new Date(2000, 0, 1, 12);
    date.setFullYear(year, month, day);
    return date;
  }

  async function focusDay(date: Date, backwards = false) {
    const key = dayKey(date);
    const next = backwards
      ? (availableDates.findLast((day) => day <= key) ?? availableDates[0])
      : (availableDates.find((day) => day >= key) ?? availableDates.at(-1));
    if (!next) return;
    focused = new Date(next + "T12:00:00");
    await tick();
    if (popup?.matches(":popover-open")) {
      popup.querySelector<HTMLButtonElement>('[data-day][tabindex="0"]')?.focus();
    }
  }

  function resetDraft() {
    draft = "";
    ondraftchange(false);
  }

  function focusOnOpen(event: ToggleEvent) {
    if (event.newState !== "open") return;
    const start =
      applied && available.has(applied.start)
        ? applied.start
        : availableDates.at(-1);
    if (start) void focusDay(new Date(start + "T12:00:00"));
  }

  function closeCalendar() {
    popup.hidePopover();
    trigger.focus();
  }

  function pick(date: Date) {
    const key = dayKey(date);
    if (!available.has(key)) return;
    focused = date;
    if (!draft) {
      draft = key;
      ondraftchange(true);
      return;
    }
    const [start, end] = [draft, key].sort();
    onselect({ start, end });
    closeCalendar();
  }

  function changeMonth(targetYear: number, targetMonth: number) {
    const prefix = dayKey(calendarDate(targetYear, targetMonth, 1)).slice(0, 7);
    const next =
      availableDates.find((day) => day.startsWith(prefix)) ??
      availableDates.find((day) => Number(day.slice(0, 4)) === targetYear);
    if (next) focused = new Date(next + "T12:00:00");
  }

  function stepMonth(step: number) {
    const next = availableMonths[monthIndex + step];
    if (next)
      changeMonth(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1);
  }

  function navigate(event: KeyboardEvent, date: Date) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -((date.getDay() + 6) % 7),
      End: 6 - ((date.getDay() + 6) % 7),
    };
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const step = event.key === "PageUp" ? -1 : 1;
      if (event.shiftKey)
        changeMonth(years[years.indexOf(year) + step] ?? year, month);
      else stepMonth(step);
      void focusDay(focused);
    } else if (Object.hasOwn(offsets, event.key)) {
      event.preventDefault();
      void focusDay(
        calendarDate(year, month, date.getDate() + offsets[event.key]),
        offsets[event.key] < 0,
      );
    }
  }
</script>

<div class="custom-range">
  <button
    class="btn"
    class:active={applied}
    type="button"
    bind:this={trigger}
    popovertarget={id}
    disabled={availableDates.length === 0}
  >
    {applied ? `${applied.start} to ${applied.end}` : "Custom"}
  </button>

  <div
    class="card calendar"
    {id}
    popover="auto"
    role="dialog"
    aria-label="Custom date range"
    bind:this={popup}
    onbeforetoggle={resetDraft}
    ontoggle={focusOnOpen}
  >
    <div class="row calendar-header">
      <button
        class="btn btn-quiet"
        type="button"
        aria-label="Previous month"
        disabled={monthIndex <= 0}
        onclick={() => stepMonth(-1)}
      >
        ‹
      </button>
      <select
        aria-label="Month"
        value={month}
        onchange={(event) =>
          changeMonth(year, Number(event.currentTarget.value))}
      >
        {#each months as label, index}<option
            value={index}
            disabled={!availableMonths.includes(
              `${year.toString().padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`,
            )}
          >
            {label}
          </option>{/each}
      </select>
      <select
        aria-label="Year"
        value={year}
        onchange={(event) =>
          changeMonth(Number(event.currentTarget.value), month)}
      >
        {#each years as value}<option {value}>{value}</option>{/each}
      </select>
      <button
        class="btn btn-quiet"
        type="button"
        aria-label="Next month"
        disabled={monthIndex >= availableMonths.length - 1}
        onclick={() => stepMonth(1)}
      >
        ›
      </button>
    </div>

    <p class="small muted" aria-live="polite">
      {draft ? "Choose the other date." : "Choose the first date."}
    </p>
    <div class="days" role="group" aria-label={months[month] + " " + year}>
      {#each weekdays as day}<span class="small muted" aria-hidden="true">
          {day}
        </span>{/each}
      {#each days as date (dayKey(date))}
        {@const key = dayKey(date)}
        <button
          type="button"
          data-day
          disabled={!available.has(key)}
          tabindex={key === dayKey(focused) ? 0 : -1}
          style:grid-column-start={date.getDate() === 1
            ? offset + 1
            : undefined}
          aria-label={date.toLocaleDateString(undefined, { dateStyle: "full" })}
          aria-pressed={draft
            ? key === draft
            : !!applied && key >= applied.start && key <= applied.end}
          onclick={() => pick(date)}
          onkeydown={(event) => navigate(event, date)}
        >
          {date.getDate()}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .custom-range {
    align-self: end;
  }

  .active {
    background: var(--accent);
    color: #fffaf0;
  }

  .calendar {
    width: min(22rem, calc(100vw - 1rem));
    max-height: calc(100dvh - 1rem);
    overflow: auto;
    color: var(--text);
    padding: 1rem;
    border-color: var(--border-strong);
  }

  .calendar-header {
    flex-wrap: nowrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .calendar-header select {
    min-width: 0;
    flex: 1;
    padding: 0.5rem;
    background: var(--surface-sunk);
  }

  .calendar-header button {
    flex: 0 0 2rem;
    padding: 0;
    font-size: 1.4rem;
  }

  .calendar-header select[aria-label="Year"] {
    flex: 0 0 5.5rem;
  }

  .days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.2rem;
    text-align: center;
  }

  .days > span {
    padding-bottom: 0.4rem;
    font-weight: 700;
  }

  .days button {
    min-height: 2.4rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .days button:hover:enabled {
    background: var(--accent-wash);
    color: var(--accent-deep);
  }

  .days button:disabled {
    color: var(--faint);
    opacity: 0.4;
    cursor: default;
  }

  .days button[aria-pressed="true"]:enabled {
    background: var(--accent);
    color: #fffaf0;
  }
</style>
