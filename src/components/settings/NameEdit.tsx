"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { updateUserName } from "@/app/actions";
import { Session } from "next-auth";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

const NameEdit = ({ session }: { session: Session }) => {
  const {
    user: { id: userId, name },
  } = session;
  const { toast } = useToast();

  // Define the form schema using Zod
  const FormSchema = z.object({
    name: z.string().min(1, "Name is required"),
  });

  // Initialize the form
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: name ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { userId: string; name: string }) => {
      return updateUserName(data);
    },
    onSuccess: (_, { name }) => {
      // Show success toast
      toast({
        title: "Success",
        description: (
          <>
            Your name has been updated to {name}.<br />
            Refresh Page to see name change across the application.
          </>
        ),
        variant: "success",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "There was an error updating your name.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: { name: string }) => {
    mutation.mutate({ userId: userId ?? '', name: values.name });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alter Ego Activation</CardTitle>
        <CardDescription>
          Ready to rebrand? Change your name and watch your alter ego come to
          life—cape optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="flex flex-col  gap-y-4"
            onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={mutation.isPending}
                      placeholder="Your name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="self-end">
              <Button
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NameEdit;
