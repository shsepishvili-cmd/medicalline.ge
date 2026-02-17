import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './sanity/schema';

export default defineConfig({
  name: 'default',
  title: 'Medical Line Admin',
  projectId: '6ikh5d8u', // შენი პროექტის ID
  dataset: 'production',
  basePath: '/studio',
  plugins: [structureTool(), visionTool()],
  schema: schema,
});