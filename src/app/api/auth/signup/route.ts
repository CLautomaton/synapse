import { NextResponse } from 'next/server';
import { adminAuth, adminDB } from '@/config/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, surname, roleID } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // create auth user
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: `${name ?? ''} ${surname ?? ''}`.trim(),
        });

        const uid = userRecord.uid;

        // create firestore user doc
        await adminDB.collection('users').doc(uid).set({
            name: name ?? null,
            surname: surname ?? null,
            email: email,
            roleID: roleID ?? '4',
            createDate: admin.firestore.FieldValue.serverTimestamp(),
            projectAccessIDs: null,
        });

        return NextResponse.json({ uid });
    } catch (err: any) {
        const message = err?.message || 'Signup failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
