'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTeamSettings } from '@/hooks/use-team-settings';
import { Team } from '@/types/team';
import { TeamRole } from '@prisma/client';

const teamSettingsSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string(),
  maxMembers: z.number().min(1).max(100),
});

interface TeamSettingsProps {
  team: Team;
}

export function TeamSettings({ team }: TeamSettingsProps) {
  const { updateTeam, regenerateInviteCode, deleteTeam, isLoading } =
    useTeamSettings(team.id);

  const form = useForm<z.infer<typeof teamSettingsSchema>>({
    resolver: zodResolver(teamSettingsSchema),
    defaultValues: {
      name: team.name,
      description: team.description ?? '',
      maxMembers: team.maxMembers || 5,
    },
  });

  const onSubmit = (data: z.infer<typeof teamSettingsSchema>) => {
    updateTeam(data);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>
            Manage your team&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Members</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of members allowed in the team
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Code</CardTitle>
          <CardDescription>Manage your team&apos;s invite code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input value={team.inviteCode ?? ''} readOnly />
            <Button onClick={() => regenerateInviteCode()} disabled={isLoading}>
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>
      {team.role === 'OWNER' ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete this team and all its data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  Delete Team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your team and remove all associated data including files,
                    buckets, and member records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteTeam()}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
