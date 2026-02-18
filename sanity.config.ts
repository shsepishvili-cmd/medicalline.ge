import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './sanity/schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'Medical Line Admin',
  projectId: 'ptbt8zpkjyqqui8zowmt1jk9', 
  dataset: 'production',
  basePath: '/studio',
  plugins: [structureTool(), visionTool()],
  schema: schema,
});