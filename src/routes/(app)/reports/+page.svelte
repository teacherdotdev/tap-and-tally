<!-- One table per Class and date range: students down the side, Behaviors across the top. -->
<script lang="ts">
  import { navigating, page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    RANGES,
    dayKey,
    rangeStart,
    readCalendarRange,
    type CalendarRange,
    type Range,
  } from "$lib/domain/days";
  import { buildReport, reportCsv, reportDates } from "$lib/domain/reports";
  import ReportDateRange from "$lib/components/ReportDateRange.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { store } from "$lib/store.svelte";

  let pendingRange = $state(false);
  let range = $state<Range>("week");
  const requestedClass = $derived(page.url.searchParams.get("class"));
  const cls = $derived(
    requestedClass === null ? store.data.classes[0] : store.findClass(requestedClass),
  );
  const availableDates = $derived(cls ? reportDates(cls, store.data) : []);
  const custom = $derived(readCalendarRange(page.url.searchParams));
  const report = $derived(
    cls ? buildReport(cls, store.data, custom ?? rangeStart(range)) : null,
  );
  const downloadDisabled = $derived(pendingRange || navigating.to !== null);

  function setFilters(classId: string, dates: CalendarRange | null) {
    const url = new URL(page.url);
    url.searchParams.set("class", classId);
    if (dates) {
      url.searchParams.set("start", dates.start);
      url.searchParams.set("end", dates.end);
    } else {
      url.searchParams.delete("start");
      url.searchParams.delete("end");
    }
    if (url.href !== page.url.href) {
      void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function selectPreset(classId: string, value: Range) {
    range = value;
    setFilters(classId, null);
  }

  function download() {
    if (!cls || !report || downloadDisabled) return;
    const file = new Blob([reportCsv(report)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    const period = custom ? `${custom.start} to ${custom.end}` : RANGES.find((r) => r.value === range)?.label;
    link.download = `${cls.name} - ${period} - ${dayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
</script>

<svelte:head><title>Reports · Tap & Tally</title></svelte:head>

<div class="page stack">
  <h1>Reports</h1>

  {#if store.data.classes.length === 0}
    <p class="card muted">Set up a class to see reports.</p>
  {:else}
    <div class="row">
      <label class="grow">
        Class
        <select
          value={cls?.id ?? ""}
          onchange={(event) => setFilters(event.currentTarget.value, custom)}
        >
          {#if !cls}<option value="" disabled>Choose a class</option>{/if}
          {#each store.data.classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
      {#if cls}
        {@const classId = cls.id}
        <div class="ranges" role="radiogroup" aria-label="Date range">
          {#each RANGES as r}
            <button role="radio" aria-checked={!custom && range === r.value} class:on={!custom && range === r.value} onclick={() => selectPreset(classId, r.value)}>{r.label}</button>
          {/each}
        </div>
        {#key classId}
          <ReportDateRange
            applied={custom}
            {availableDates}
            onselect={(dates) => setFilters(classId, dates)}
            ondraftchange={(pending) => (pendingRange = pending)}
          />
        {/key}
      {/if}
    </div>

    {#if !cls}
      <p class="muted" role="status">This report’s class is unavailable in this browser. Choose a class to view a report.</p>
    {/if}
    {#if report}
      {#if custom && !report.hasActivity}
        <p class="muted" role="status">No taps or absences recorded in this date range.</p>
      {/if}
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              {#each report.columns as column (column.behavior.id)}
                <th class="num">{column.behavior.emoji} {column.label}</th>
              {/each}
              <th class="num">Days absent</th>
            </tr>
          </thead>
          <tbody>
            {#each report.rows as row}
              <tr class:left={row.left}>
                <td>{row.name}{#if row.left} <span class="muted small">(left)</span>{/if}</td>
                {#each row.counts as n}<td class="num" class:zero={n === 0}>{n}</td>{/each}
                <td class="num" class:zero={row.absent === 0}>{row.absent}</td>
              </tr>
            {:else}
              <tr><td colspan={report.columns.length + 2} class="muted">No students in this class.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="row">
        <span class="spacer"></span>
        <button class="btn btn-primary" onclick={download} disabled={downloadDisabled}><Icon name="download" size={16} /> Download spreadsheet</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .grow {
    flex: 1;
    min-width: 200px;
  }

  .ranges {
    display: flex;
    align-self: end;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
  }

  .ranges button {
    min-height: 40px;
    padding: 0.3rem 0.9rem;
    border: 0;
    background: var(--surface);
    font-weight: 600;
  }

  .ranges button + button {
    border-left: 1px solid var(--border-strong);
  }

  .ranges button.on {
    background: var(--accent);
    color: #fffaf0;
  }

  .table-wrap {
    overflow-x: auto;
    padding: 0.5rem 1rem;
  }

  .zero {
    color: var(--border);
  }

  .left td {
    color: var(--muted);
  }
</style>
