export const AI_KNOWLEDGE_FALLBACK = 'ამ ინფორმაციას გადავამოწმებ.'

export const AI_KNOWLEDGE_SCOPE = 'აგენტმა Medical Line-ის ფაქტებზე პასუხი უნდა გასცეს მხოლოდ approved correction, strict knowledge, current prices/products და approved technical sources-იდან.'

export const AI_KNOWLEDGE_PRIORITY = [
	'approved correction',
	'strict knowledge',
	'current price/commercial condition',
	'active products table',
	'approved technical knowledge',
	'training behavior',
	'general model knowledge',
] as const