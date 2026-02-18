export const schema = {
  types: [
    {
      name: 'product',
      title: 'პროდუქცია',
      type: 'document',
      fields: [
        {
          name: 'name',
          title: 'დასახელება',
          type: 'string',
        },
        {
          name: 'price',
          title: 'ფასი',
          type: 'string',
        },
        {
          name: 'image',
          title: 'სურათი',
          type: 'image',
          options: {
            hotspot: true,
          },
        },
        {
          name: 'cat',
          title: 'კატეგორია',
          type: 'string',
          options: {
            list: [
              { title: 'სხვა პარტნიორი ბრენდები', value: 'სხვა პარტნიორი ბრენდები' },
              { title: 'ენდოდონტია', value: 'ენდოდონტია' },
              { title: 'რადიოლოგია', value: 'რადიოლოგია' },
              { title: 'ციფრული სკანერები', value: 'ციფრული სკანერები' },
              { title: 'ქირურგია', value: 'ქირურგია' },
              { title: 'ოპტიკა', value: 'ოპტიკა' },
              { title: 'ჰიგიენა', value: 'ჰიგიენა' },
              { title: 'სხვა', value: 'სხვა' },
            ],
          },
        },
        {
          name: 'description',
          title: 'აღწერა',
          type: 'text',
        },
        {
          name: 'specs',
          title: 'მახასიათებლები',
          type: 'array',
          of: [{ type: 'string' }],
        },
      ],
    },
  ],
}