"use client";

import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";

import { type TaskList, taskSourceLabel } from "./task-types";

const dateTime = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);

export function TasksTable({
  tasks,
  hasTasks,
  selectedId,
  onSelect,
}: {
  tasks: TaskList;
  hasTasks: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (tasks.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {hasTasks
          ? "No tasks match these filters."
          : "No collection tasks exist yet."}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="text-muted-foreground border-b text-xs uppercase">
          <tr>
            <th className="p-3">Task</th>
            <th className="p-3">Source</th>
            <th className="p-3">Location</th>
            <th className="p-3">Coordinates</th>
            <th className="p-3">Priority</th>
            <th className="p-3">Reason</th>
            <th className="p-3">Status</th>
            <th className="p-3">Truck</th>
            <th className="p-3">Route</th>
            <th className="p-3">Created</th>
            <th className="p-3">Completed</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              tabIndex={0}
              aria-selected={selectedId === task.id}
              onClick={() => onSelect(task.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(task.id);
                }
              }}
              className={`hover:bg-muted/60 cursor-pointer border-b focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${selectedId === task.id ? "bg-muted" : ""} ${task.priority === "critical" ? "border-l-2 border-l-red-500" : ""}`}
            >
              <td className="p-3 font-medium">{task.displayId}</td>
              <td className="p-3">
                {taskSourceLabel(task.sourceType)}
                <br />
                <span className="text-muted-foreground text-xs">
                  {task.sourceReference}
                </span>
              </td>
              <td className="p-3">{task.locationLabel}</td>
              <td className="p-3 font-mono text-xs">
                {task.latitude.toFixed(5)}, {task.longitude.toFixed(5)}
              </td>
              <td className="p-3">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="max-w-48 truncate p-3">{task.reason}</td>
              <td className="p-3">
                <StatusBadge status={task.status} />
              </td>
              <td className="p-3">{task.assignedTruck?.displayId ?? "—"}</td>
              <td className="p-3">{task.route?.displayId ?? "—"}</td>
              <td className="p-3 whitespace-nowrap">
                {dateTime(task.createdAt)}
              </td>
              <td className="p-3 whitespace-nowrap">
                {dateTime(task.completedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
