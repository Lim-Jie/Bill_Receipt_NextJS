import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'This Month';

        const headerStore = await headers();
        const authheader = headerStore.get('authorization') || '';
        if (!authheader.startsWith('Bearer')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: '401' })
        }
        const token = authheader.split(' ')[1]
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
        if(userErr || !user){
            return NextResponse.json({error: 'Unauthorized'}, {status: 401})
        }

        // Calculate date range based on period
        const now = new Date();
        let startDate;

        switch (period) {
            case 'Today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'Weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'This Month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Query ONLY receipt_consumers table using its created_at timestamp
        const { data: expenseData, error } = await supabase
            .from('receipt_consumers')
            .select('total_paid, created_at')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Since we don't have category in receipt_consumers, 
        // we'll group by time periods or just return total
        let totalAmount = 0;
        
        expenseData.forEach(consumer => {
            const amount = parseFloat(consumer.total_paid) || 0;
            totalAmount += amount;
        });

        // Since there's no category in receipt_consumers, create a single category
        const expenseCategories = [{
            name: 'Total Expenses',
            value: totalAmount,
            color: '#c496fc'
        }];

        return NextResponse.json({
            expenseData: expenseCategories,
            totalAmount,
            period,
            recordCount: expenseData.length
        });

    } catch (error) {
        console.error('Error fetching expense summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense summary' },
            { status: 500 }
        );
    }
}