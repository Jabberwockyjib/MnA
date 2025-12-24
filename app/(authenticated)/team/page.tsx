import { getDeals, getDealMembers } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Mail, Shield, UserCheck } from 'lucide-react'
import { MemberRoleSelect } from './member-role-select'
import { RemoveMemberButton } from './remove-member-button'

export default async function TeamPage() {
    const deals = await getDeals()
    const activeDeal = deals[0]

    if (!activeDeal) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Active Deal</h2>
                    <p className="text-muted-foreground">Create a deal to start managing team members.</p>
                </div>
            </div>
        )
    }

    const members = await getDealMembers(activeDeal.id)

    // Group by role
    const admins = members.filter(m => m.role === 'admin')
    const regularMembers = members.filter(m => m.role === 'member')
    const viewers = members.filter(m => m.role === 'viewer')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Team</h1>
                <p className="text-muted-foreground">
                    {activeDeal.name} • {members.length} team members
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admins</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{admins.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Full access
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Members</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{regularMembers.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Can edit
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Viewers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{viewers.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Read only
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        Manage access and roles for this deal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {members.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No team members</h3>
                            <p className="text-muted-foreground">
                                Team members will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={member.profiles?.avatar_url || ''} />
                                            <AvatarFallback>
                                                {member.profiles?.full_name?.[0]?.toUpperCase() ||
                                                 member.profiles?.email?.[0]?.toUpperCase() ||
                                                 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">
                                                    {member.profiles?.full_name || 'Unknown User'}
                                                </h3>
                                                <Badge variant={
                                                    member.role === 'admin' ? 'default' :
                                                    member.role === 'member' ? 'secondary' :
                                                    'outline'
                                                }>
                                                    {member.role}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-4 w-4" />
                                                {member.profiles?.email || 'No email'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MemberRoleSelect
                                            memberId={member.id}
                                            currentRole={member.role}
                                            dealId={activeDeal.id}
                                        />
                                        {members.length > 1 && (
                                            <RemoveMemberButton
                                                memberId={member.id}
                                                dealId={activeDeal.id}
                                                memberName={member.profiles?.full_name || member.profiles?.email || 'member'}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Role Descriptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Admin</h4>
                            <p className="text-sm text-muted-foreground">
                                Full access to manage deal settings, team members, and all workstreams
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <UserCheck className="h-5 w-5 text-secondary mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Member</h4>
                            <p className="text-sm text-muted-foreground">
                                Can view, edit, and manage documents and communications
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Viewer</h4>
                            <p className="text-sm text-muted-foreground">
                                Read-only access to view documents and daily briefs
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
