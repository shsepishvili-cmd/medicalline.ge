export const product = {
  name: 'product',
  title: 'პროდუქცია',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'პროდუქტის სახელი',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
    },
    {
      name: 'image',
      title: 'სურათი',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'description',
      title: 'აღწერა',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
}