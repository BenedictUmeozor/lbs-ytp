"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ACCEPTED_REPORT_PHOTO_TYPES,
  isAcceptedReportPhotoSize,
  isAcceptedReportPhotoType,
  MAX_REPORT_PHOTO_SIZE,
} from "@/convex/domain/report_rules";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { LocateFixed, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { REPORT_CATEGORIES, type ReportCategory } from "./report-types";

type LocationMode = "coordinates" | "landmark";
type Coordinates = { latitude: number; longitude: number };
type FormField = "category" | "description" | "location" | "landmark" | "photo";
type FormErrors = Partial<Record<FormField, string>>;
type ReportSubmissionErrorData = {
  code:
    | "INVALID_DESCRIPTION"
    | "INVALID_LOCATION"
    | "INVALID_LANDMARK"
    | "INVALID_PHOTO"
    | "SUBMISSION_FAILED";
  field?: Exclude<FormField, "category">;
  message: string;
};

function formatFileSize(size: number): string {
  return `${(size / 1024 / 1024).toFixed(size < 1024 * 1024 ? 1 : 2)} MiB`;
}

function isReportSubmissionErrorData(
  value: unknown,
): value is ReportSubmissionErrorData {
  if (typeof value !== "object" || value === null) return false;
  const { code, field, message } = value as Record<string, unknown>;
  return (
    (code === "INVALID_DESCRIPTION" ||
      code === "INVALID_LOCATION" ||
      code === "INVALID_LANDMARK" ||
      code === "INVALID_PHOTO" ||
      code === "SUBMISSION_FAILED") &&
    typeof message === "string" &&
    (field === undefined ||
      field === "description" ||
      field === "location" ||
      field === "landmark" ||
      field === "photo")
  );
}

export function SubmitReportForm() {
  const generatePhotoUploadUrl = useMutation(
    api.reports.generatePhotoUploadUrl,
  );
  const submitWebReport = useMutation(api.reports.submitWebReport);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [locationMode, setLocationMode] = useState<LocationMode>("coordinates");
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [landmarkText, setLandmarkText] = useState("");
  const [photo, setPhoto] = useState<File>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [locationState, setLocationState] = useState<
    "idle" | "requesting" | "success" | "error"
  >("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const landmarkRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  function focusField(field?: FormField) {
    requestAnimationFrame(() => {
      if (field === "category") categoryRef.current?.focus();
      else if (field === "description") descriptionRef.current?.focus();
      else if (field === "location") locationRef.current?.focus();
      else if (field === "landmark") landmarkRef.current?.focus();
      else if (field === "photo") photoRef.current?.focus();
      else formErrorRef.current?.focus();
    });
  }

  function focusFirstError(nextErrors: FormErrors) {
    const fields: FormField[] = [
      "category",
      "description",
      "location",
      "landmark",
      "photo",
    ];
    focusField(fields.find((field) => nextErrors[field] !== undefined));
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (category === "") nextErrors.category = "Choose the waste issue type.";
    if (description.trim().length === 0) {
      nextErrors.description = "Describe the waste issue.";
    } else if (description.trim().length > 1000) {
      nextErrors.description = "Description must be 1,000 characters or fewer.";
    }
    if (locationMode === "coordinates" && coordinates === undefined) {
      nextErrors.location = "Share your current location before submitting.";
    }
    if (locationMode === "landmark") {
      const landmark = landmarkText.trim();
      if (landmark.length < 3 || landmark.length > 200) {
        nextErrors.landmark =
          "Enter a nearby landmark between 3 and 200 characters.";
      }
    }
    if (photo !== undefined) {
      if (!isAcceptedReportPhotoType(photo.type)) {
        nextErrors.photo = "Choose a JPEG, PNG or WebP image.";
      } else if (!isAcceptedReportPhotoSize(photo.size)) {
        nextErrors.photo = "Photo must be 5 MiB or smaller.";
      }
    }
    return nextErrors;
  }

  function requestLocation() {
    setErrors((current) => ({ ...current, location: undefined }));
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      setLocationMessage(
        "Your browser cannot share a location. Enter a nearby landmark instead.",
      );
      return;
    }
    setLocationState("requesting");
    setLocationMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("success");
        setLocationMessage("Current location added.");
      },
      (error) => {
        setLocationState("error");
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enter a nearby landmark instead, or try again."
            : error.code === error.TIMEOUT
              ? "Location request timed out. Try again or enter a nearby landmark."
              : "Your location is unavailable. Try again or enter a nearby landmark.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function chooseLocationMode(mode: LocationMode) {
    setLocationMode(mode);
    setErrors((current) => ({
      ...current,
      location: undefined,
      landmark: undefined,
    }));
    if (mode === "landmark") {
      setCoordinates(undefined);
      setLocationState("idle");
      setLocationMessage("");
    }
  }

  function selectPhoto(file?: File) {
    setPhoto(file);
    if (file === undefined) {
      setErrors((current) => ({ ...current, photo: undefined }));
      return;
    }
    if (!isAcceptedReportPhotoType(file.type)) {
      setErrors((current) => ({
        ...current,
        photo: "Choose a JPEG, PNG or WebP image.",
      }));
    } else if (!isAcceptedReportPhotoSize(file.size)) {
      setErrors((current) => ({
        ...current,
        photo: "Photo must be 5 MiB or smaller.",
      }));
    } else {
      setErrors((current) => ({ ...current, photo: undefined }));
    }
  }

  function removePhoto() {
    setPhoto(undefined);
    if (photoRef.current) photoRef.current.value = "";
    setErrors((current) => ({ ...current, photo: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let photoStorageId: Id<"_storage"> | undefined;
      if (photo !== undefined) {
        try {
          const uploadUrl = await generatePhotoUploadUrl({});
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": photo.type },
            body: photo,
          });
          if (!response.ok) throw new Error("Photo upload failed.");
          const body: unknown = await response.json();
          if (
            typeof body !== "object" ||
            body === null ||
            !("storageId" in body) ||
            typeof body.storageId !== "string"
          ) {
            throw new Error("Photo upload failed.");
          }
          photoStorageId = body.storageId as Id<"_storage">;
        } catch {
          setErrors({ photo: "Photo upload failed. Please try again." });
          focusField("photo");
          return;
        }
      }

      const result = await submitWebReport({
        category: category as ReportCategory,
        description,
        latitude:
          locationMode === "coordinates" ? coordinates?.latitude : undefined,
        longitude:
          locationMode === "coordinates" ? coordinates?.longitude : undefined,
        landmarkText: locationMode === "landmark" ? landmarkText : undefined,
        photoStorageId,
      });
      window.location.assign(
        `/report/submitted?reference=${encodeURIComponent(result.referenceNumber)}`,
      );
    } catch (error) {
      if (
        error instanceof ConvexError &&
        isReportSubmissionErrorData(error.data)
      ) {
        const { field, message } = error.data;
        if (field !== undefined) {
          setErrors({ [field]: message });
          focusField(field);
        } else {
          setFormError(message);
          focusField();
        }
      } else {
        setFormError(
          "Unable to submit your report right now. Please try again.",
        );
        focusField();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const charactersRemaining = 1000 - description.length;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-7">
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-semibold">
          What is the problem?
        </label>
        <select
          ref={categoryRef}
          id="category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as ReportCategory)
          }
          aria-invalid={errors.category !== undefined}
          aria-describedby={errors.category ? "category-error" : undefined}
          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/20"
        >
          <option value="">Select a waste issue</option>
          {REPORT_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p id="category-error" role="alert" className="text-sm text-red-700">
            {errors.category}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="text-sm font-semibold">
            Describe the issue
          </label>
          <span className="text-xs text-stone-500">
            {charactersRemaining} left
          </span>
        </div>
        <textarea
          ref={descriptionRef}
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          aria-invalid={errors.description !== undefined}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          className="min-h-32 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/20"
        />
        {errors.description ? (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.description}
          </p>
        ) : null}
      </div>

      <fieldset
        className="space-y-3"
        aria-describedby={errors.location ? "location-error" : undefined}
      >
        <legend className="text-sm font-semibold">Where is it?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`rounded-lg border p-3 text-left text-sm font-medium ${locationMode === "coordinates" ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-300 bg-white"}`}
          >
            <input
              type="radio"
              name="location-method"
              value="coordinates"
              ref={locationRef}
              checked={locationMode === "coordinates"}
              onChange={() => chooseLocationMode("coordinates")}
              className="mr-2 accent-emerald-800"
            />
            Use my current location
          </label>
          <label
            className={`rounded-lg border p-3 text-left text-sm font-medium ${locationMode === "landmark" ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-300 bg-white"}`}
          >
            <input
              type="radio"
              name="location-method"
              value="landmark"
              checked={locationMode === "landmark"}
              onChange={() => chooseLocationMode("landmark")}
              className="mr-2 accent-emerald-800"
            />
            Enter a nearby landmark
          </label>
        </div>
        {locationMode === "coordinates" ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <Button
              type="button"
              onClick={requestLocation}
              disabled={locationState === "requesting"}
              variant="outline"
              className="h-10"
            >
              <LocateFixed aria-hidden="true" />
              {locationState === "requesting"
                ? "Requesting location…"
                : coordinates
                  ? "Update current location"
                  : "Use my current location"}
            </Button>
            {locationMessage ? (
              <p
                aria-live="polite"
                className={`mt-2 text-sm ${locationState === "error" ? "text-red-700" : "text-emerald-800"}`}
              >
                {locationMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="landmark" className="text-sm text-stone-700">
              Nearby landmark
            </label>
            <Input
              ref={landmarkRef}
              id="landmark"
              value={landmarkText}
              onChange={(event) => setLandmarkText(event.target.value)}
              maxLength={200}
              placeholder="Near Bariga Market, beside the main gate"
              aria-invalid={errors.landmark !== undefined}
              aria-describedby={errors.landmark ? "landmark-error" : undefined}
            />
            <p className="text-xs text-stone-500">
              For example: Pedro Bus Stop, Bariga.
            </p>
            {errors.landmark ? (
              <p
                id="landmark-error"
                role="alert"
                className="text-sm text-red-700"
              >
                {errors.landmark}
              </p>
            ) : null}
          </div>
        )}
        {errors.location ? (
          <p id="location-error" role="alert" className="text-sm text-red-700">
            {errors.location}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="photo" className="text-sm font-semibold">
          Add one photo{" "}
          <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <Input
          ref={photoRef}
          id="photo"
          type="file"
          accept={ACCEPTED_REPORT_PHOTO_TYPES.join(",")}
          onChange={(event) => selectPhoto(event.target.files?.[0])}
          aria-invalid={errors.photo !== undefined}
          aria-describedby={errors.photo ? "photo-error" : undefined}
        />
        <p className="text-xs text-stone-500">
          JPEG, PNG or WebP only. Maximum{" "}
          {formatFileSize(MAX_REPORT_PHOTO_SIZE)}.
        </p>
        {photo ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
            <span className="min-w-0 truncate">
              {photo.name} · {formatFileSize(photo.size)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removePhoto}
            >
              <X aria-hidden="true" /> Remove
            </Button>
          </div>
        ) : null}
        {errors.photo ? (
          <p id="photo-error" role="alert" className="text-sm text-red-700">
            {errors.photo}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p
          ref={formErrorRef}
          tabIndex={-1}
          role="alert"
          className="text-sm text-red-700 outline-none"
        >
          {formError}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-12 w-full bg-emerald-800 hover:bg-emerald-900"
      >
        {isSubmitting ? (
          "Submitting report…"
        ) : (
          <>
            <Upload aria-hidden="true" /> Submit report
          </>
        )}
      </Button>
    </form>
  );
}
