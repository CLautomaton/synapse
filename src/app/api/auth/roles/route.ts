import { NextResponse } from 'next/server';
import { adminDB } from '@/config/firebaseAdmin';

export async function GET() {
    try {
        const snap = await adminDB.collection('roles').get();
        const roles: Array<{ roleID: string; name: string }> = [];
        snap.forEach((doc) => {
            const data = doc.data() as any;
            roles.push({ roleID: doc.id, name: data.name ?? doc.id });
        });

        // ensure Unassigned role id 4 exists as an option
        if (!roles.find(r => r.roleID === '4')) {
            roles.push({ roleID: '4', name: 'Unassigned' });
        }

        return NextResponse.json({ roles });
    } catch (err: any) {
        return NextResponse.json({ roles: [{ roleID: '4', name: 'Unassigned' }] }, { status: 500 });
    }
}
