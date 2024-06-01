// src/utils/formatNumber.js
export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDateToUTC(date) {
  // Create a new Date object with the selected date
  let localDate = new Date(date);

  // Adjust the date to UTC without changing the local date
  let utcDate = new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      0,
      0,
      0 // Set time to midnight UTC
    )
  );

  // Convert to ISO string and split to get the date part
  return utcDate.toISOString().split("T")[0];
}

