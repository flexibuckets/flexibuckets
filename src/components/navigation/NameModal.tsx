"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateUserName } from "@/app/actions"; // Updated import path
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // shadcn form components
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
// shadcn's useToast

interface NameModalProps {
  userId: string;
  isOpen: boolean;
  onClose: (name?: string) => void; // Accepts optional name
}

export function NameModal({ userId, isOpen, onClose }: NameModalProps) {
  const { toast } = useToast();

  // Define the form schema using Zod
  const FormSchema = z.object({
    name: z.string().min(1, "Name is required"),
  });

  // Initialize the form
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Set up the mutation
  const mutation = useMutation({
    mutationFn: async (data: { userId: string; name: string }) => {
      return updateUserName(data);
    },
    onSuccess: (_, variables) => {
      // Show success toast
      toast({
        title: "Success",
        description: "Your name has been updated.",
        variant: "success",
      });
      // Close the modal and pass the new name
      onClose(variables.name);
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
    mutation.mutate({ userId, name: values.name });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Your Identity</DialogTitle>
          <DialogDescription>
            Username not set? Let&apos;s fix that! Think superhero names, secret
            agents, or just the best version of "you."
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
