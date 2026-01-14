import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormLabel, Form, FormControl, FormMessage } from '@/components/ui/form';
import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const schema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    name: z.string().min(1, 'Name is required'),
    surname: z.string().min(1, 'Surname is required'),

}).refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
});

type SignUpFormData = z.infer<typeof schema>;

export default function SignUp() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const form = useForm<SignUpFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            surname: '',
        },
    });



    const onSubmit = async (data: SignUpFormData) => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    name: data.name,
                    surname: data.surname,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                setErrorMsg(json?.error || 'Signup failed');
                setIsLoading(false);
                return;
            }

            setIsLoading(false);

            window.location.href = '/auth/signin';

        } catch (err: any) {
            setErrorMsg(err?.message || 'Unexpected error');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center flex-col justify-center min-h-screen bg-gray-100">
            <div className="p-4 m-14 bg-white rounded-xl shadow-md w-full max-w-sm">
                <h1 className="text-xl font-semibold text-center">Create an account</h1>
                <p className="text-center text-sm mt-2">Already have an account? <a href="/auth/signin" className="text-blue-600">Sign in</a></p>
            </div>
            <Form {...form}>
                <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }} className="inline-block">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="name">Name</FormLabel>
                                <FormControl>
                                    <Input id="name" placeholder="First name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="surname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="surname">Surname</FormLabel>
                                <FormControl>
                                    <Input id="surname" placeholder="Surname" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="email">Email</FormLabel>
                                <FormControl>
                                    <Input id="email" type="email" placeholder="Email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="password">Password</FormLabel>
                                <FormControl>
                                    <Input id="password" type="password" placeholder="Password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="confirmPassword">Confirm password</FormLabel>
                                <FormControl>
                                    <Input id="confirmPassword" type="password" placeholder="Confirm password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />



                    <Button type="submit" style={{ marginTop: 12 }}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Sign up'}
                    </Button>

                    {errorMsg && <p className="text-red-500 mt-2">{errorMsg}</p>}
                </form>
            </Form>
        </div>
    );
}
