'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { updateMemberRole } from '../actions'
import { useRouter } from 'next/navigation'
import { ChevronDown, Shield, UserCheck, Users } from 'lucide-react'

export function MemberRoleSelect({
    memberId,
    currentRole,
    dealId
}: {
    memberId: string
    currentRole: string
    dealId: string
}) {
    const router = useRouter()

    const handleRoleChange = async (newRole: string) => {
        if (newRole === currentRole) return

        await updateMemberRole(memberId, newRole, dealId)
        router.refresh()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    Change Role
                    <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleRoleChange('admin')}
                    disabled={currentRole === 'admin'}
                >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleRoleChange('member')}
                    disabled={currentRole === 'member'}
                >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Member
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleRoleChange('viewer')}
                    disabled={currentRole === 'viewer'}
                >
                    <Users className="h-4 w-4 mr-2" />
                    Viewer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
