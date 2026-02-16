import { createClient } from '@supabase/supabase-js'

// ყოველგვარი process.env-ის გარეშე, პირდაპირ ტექსტად:
const supabaseUrl = 'https://bapvvhcokqvplvowddpm.supabase.co'
const supabaseAnonKey = 'sb_publishable_qrsAwwU0SeGKpTfJ94--CQ_A8N44rc-' 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)