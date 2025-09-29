import dayjs from 'dayjs';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import qs from 'query-string'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// created by chatgpt
export function isBase64Image(imageData: string) {
  const base64Regex = /^data:image\/(png|jpe?g|gif|webp);base64,/;
  return base64Regex.test(imageData);
}

// created by chatgpt
export function formatDateString(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString(undefined, options);

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${time} - ${formattedDate}`;
}

export const convertFileToUrl = (file: File) => URL.createObjectURL(file)

export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short', // abbreviated weekday name (e.g., 'Mon')
    month: 'short', // abbreviated month name (e.g., 'Oct')
    day: 'numeric', // numeric day of the month (e.g., '25')
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  }
}

export type UrlQueryParams = {
  params: string
  key: string
  value: string | null
}

export type RemoveUrlQueryParams = {
  params: string
  keysToRemove: string[]
}

export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  const currentUrl = qs.parse(params)

  currentUrl[key] = value

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  )
}

export const formatDateTimeF = (date: Date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

// utils/base64Url.ts

// URL-safe Base64 encoding without padding
export const encodePath = (path: string): string => {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // Remove padding
};

// URL-safe Base64 decoding
export const decodePath = (encodedPath: string): string => {
  // Add padding back if necessary
  const pad = encodedPath.length % 4;
  if (pad) {
    encodedPath += '===='.substring(pad);
  }
  encodedPath = encodedPath.replace(/-/g, '+').replace(/_/g, '/');

  try {
    return Buffer.from(encodedPath, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Failed to decode path:', error);
    return '';
  }
};

