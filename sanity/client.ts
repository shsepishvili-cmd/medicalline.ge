import { createClient } from 'next-sanity';

export const client = createClient({
  projectId: 'ptbt8zpkjyqqui8zowmt1jk9',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});