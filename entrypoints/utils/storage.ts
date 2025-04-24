import { storage } from 'wxt/storage';


export const appliedJobs = storage.defineItem<number[]>(
  'local:appliedJobs',
  {
    fallback: [],
  }
);
