import type { Currency } from './types'

const codes = new Set<Currency>(['GEL','USD','EUR','CNY'])

export function normalizeCurrency(value:unknown):Currency|null {
 if(typeof value!=='string')return null
 const normalized=value.normalize('NFKC').trim().toUpperCase()
 if(!normalized||['NULL','NONE','N/A','NA','UNKNOWN','UNSPECIFIED'].includes(normalized))return null
 if(codes.has(normalized as Currency))return normalized as Currency
 const iso=normalized.match(/(?:^|[^A-Z])(GEL|USD|EUR|CNY)(?:[^A-Z]|$)/)?.[1]
 if(iso&&codes.has(iso as Currency))return iso as Currency
 const compact=normalized.replace(/[\s._-]+/g,'')
 const compactLower=normalized.toLocaleLowerCase('ka-GE').replace(/[\s._-]+/g,'')
 if(['₾','LARI'].includes(compact)||['ლარი','ლ'].includes(compactLower))return 'GEL'
 if(['$','US$','DOLLAR','DOLLARS','USDOLLAR','USDOLLARS'].includes(compact)||compactLower==='დოლარი')return 'USD'
 if(['€','EURO','EUROS'].includes(compact)||compactLower==='ევრო')return 'EUR'
 if(['¥','元','RMB','YUAN','RENMINBI'].includes(compact)||compactLower==='იუანი')return 'CNY'
 return null
}
