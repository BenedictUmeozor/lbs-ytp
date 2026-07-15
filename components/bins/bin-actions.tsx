"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

import type { BinDetail } from "./bin-types";

export function BinActions({
  detail,
  onShowUnusual,
}: {
  detail: BinDetail;
  onShowUnusual: () => void;
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "critical"
  >("high");
  const [message, setMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const createTask = useMutation(api.bins.createManualTask);
  const markInactive = useMutation(api.bins.markDeviceInactive);
  const confirmEmptying = useMutation(api.bins.confirmEmptyingManually);
  const updateDetails = useMutation(api.bins.updateBinDetails);
  const run = async (
    action: () => Promise<unknown>,
    success: string,
    onSuccess?: () => void,
  ) => {
    if (isRunning) return;
    setMessage(null);
    setIsRunning(true);
    try {
      await action();
      onSuccess?.();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsRunning(false);
    }
  };
  const bin = detail.row;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/map?type=bin&selected=${bin.id}`}>
            View on map
          </Link>
        </Button>
        {!bin.activeTask && (
          <Button variant="outline" onClick={() => setTaskOpen(!taskOpen)}>
            Create collection task
          </Button>
        )}
        <Button
          variant="outline"
          disabled={
            isRunning || !bin.deviceId || bin.deviceStatus === "inactive"
          }
          onClick={() => {
            if (
              window.confirm(
                "Mark this device inactive? Incoming readings will be rejected.",
              )
            )
              void run(
                () => markInactive({ binId: bin.id }),
                "Device marked inactive.",
              );
          }}
        >
          Mark device inactive
        </Button>
        {bin.awaitingEmptyConfirmation && (
          <Button
            variant="outline"
            disabled={isRunning}
            onClick={() => {
              if (
                window.confirm(
                  "Confirm emptying? This sets the controlled MVP fill level to 0% and is recorded in history.",
                )
              )
                void run(
                  () => confirmEmptying({ binId: bin.id }),
                  "Emptying confirmed.",
                );
            }}
          >
            Confirm emptying
          </Button>
        )}
        <Button
          variant="outline"
          disabled={isRunning}
          onClick={() => setEditOpen(!editOpen)}
        >
          Edit name and location
        </Button>
        <Button variant="outline" onClick={onShowUnusual}>
          View flagged readings
        </Button>
      </div>
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
      {taskOpen && (
        <form
          className="space-y-2 rounded-lg border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => createTask({ binId: bin.id, priority, reason }),
              "Collection task created.",
              () => {
                setTaskOpen(false);
                setReason("");
              },
            );
          }}
        >
          <label className="block text-sm">
            Priority
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as typeof priority)
              }
              className="bg-background mt-1 block w-full rounded border p-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="block text-sm">
            Reason
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={isRunning}>
            {isRunning ? "Creating task…" : "Create task"}
          </Button>
        </form>
      )}
      {editOpen && (
        <BinEditForm
          detail={detail}
          disabled={isRunning}
          onSave={(values) =>
            run(
              () => updateDetails({ binId: bin.id, ...values }),
              "Bin details updated.",
              () => setEditOpen(false),
            )
          }
        />
      )}
    </div>
  );
}
function BinEditForm({
  detail,
  onSave,
  disabled,
}: {
  detail: BinDetail;
  disabled: boolean;
  onSave: (values: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
}) {
  const [name, setName] = useState(detail.row.name);
  const [address, setAddress] = useState(detail.row.address);
  const [latitude, setLatitude] = useState(String(detail.row.latitude));
  const [longitude, setLongitude] = useState(String(detail.row.longitude));
  return (
    <form
      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name,
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        });
      }}
    >
      <label className="text-sm">
        Name
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Address
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Latitude
        <Input
          type="number"
          step="any"
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Longitude
        <Input
          type="number"
          step="any"
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          required
        />
      </label>
      <Button type="submit" disabled={disabled}>
        {disabled ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
