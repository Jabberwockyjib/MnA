
import { login, signup, loginAsDev } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Activity, TrendingUp } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 3px),
                                 repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)`,
                backgroundSize: '50px 50px'
            }} />

            {/* Market ticker effect */}
            <div className="absolute top-0 left-0 right-0 border-b border-primary/20 bg-background/50 backdrop-blur-sm">
                <div className="px-6 py-3 flex items-center gap-6 text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-muted-foreground">SYSTEM ONLINE</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Intelligence Platform v1.0</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md animate-slide-in-up">
                {/* Logo / Header */}
                <div className="mb-8 text-center space-y-2">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="h-1 w-16 bg-primary" />
                        <Activity className="h-6 w-6 text-primary" />
                        <div className="h-1 w-16 bg-primary" />
                    </div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight">DealPulse</h1>
                    <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                        M&A Intelligence Platform
                    </p>
                </div>

                <Card className="border-2 border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="border-b-2 border-primary/20 pb-6">
                        <CardTitle className="text-2xl font-serif">Access Terminal</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Authenticate to access deal intelligence and monitoring.
                        </CardDescription>
                    </CardHeader>
                    <form>
                        <CardContent className="grid gap-6 pt-6">
                            <div className="grid gap-3">
                                <Label htmlFor="email" className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="analyst@firm.com"
                                    required
                                    className="h-11 bg-background border-border font-mono"
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password" className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="h-11 bg-background border-border font-mono"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 border-t border-border pt-6">
                            <Button
                                formAction={login}
                                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                            >
                                Sign In
                            </Button>
                            <Button
                                formAction={loginAsDev}
                                variant="secondary"
                                className="w-full h-11 font-mono text-xs"
                                formNoValidate
                            >
                                DEV MODE ACCESS
                            </Button>
                            <div className="relative w-full">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-card px-2 text-muted-foreground font-mono">OR</span>
                                </div>
                            </div>
                            <Button
                                formAction={signup}
                                variant="outline"
                                className="w-full h-11 border-primary/30 hover:border-primary hover:bg-primary/5"
                            >
                                Create Account
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
                    <p>Secure authentication • 256-bit encryption</p>
                </div>
            </div>
        </div>
    )
}
