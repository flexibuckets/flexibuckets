import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { z } from "zod";
import { Button } from "../ui/button";
import { Loader2, Plus } from 'lucide-react';
import { Input } from "../ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { addBucketFormSchema as formSchema } from "@/lib/schemas";
import { S3Provider } from "@prisma/client";
import { useBuckets } from "@/hooks/use-buckets";
import { useCheckBucketLimit } from "@/hooks/use-check-bucket-limit";

type BucketFormProps = {
  userId: string;
};

const BucketForm = ({ userId }: BucketFormProps) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessKey: "",
      secretKey: "",
      bucket: "",
      region: "",
      provider: S3Provider.MINIO,
      endpointUrl: "",
    },
  });
  const { toast } = useToast();
  const { mutateAsync: checkLimit, isPending: isCheckingLimit } = useCheckBucketLimit();
  const { addBucket, isAddingCreds } = useBuckets(userId);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await checkLimit(userId);
      
      const formattedValues = {
        ...values,
        region: values.region.trim(),
        endpointUrl: values.endpointUrl.trim().replace(/\/$/, ''),
      };

      addBucket({ userId, values: formattedValues }, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({
            title: "Bucket Added",
            description: `Your new bucket ${formattedValues.bucket} has been successfully added.`,
          });
        },
      });
    } catch (error) {
      // Error handling is done by the hooks
    }
  }

  const isFieldDisabled = isAddingCreds || isCheckingLimit;
  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <Button disabled={isFieldDisabled}>
          {isFieldDisabled ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {isAddingCreds
            ? "Adding the bucket"
            : "Add Bucket"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Bucket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="accessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input disabled={isFieldDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <Input disabled={isFieldDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpointUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input disabled={isFieldDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bucket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>S3 Bucket Name</FormLabel>
                    <FormControl>
                      <Input disabled={isFieldDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., ap-south-1 or auto" 
                        disabled={isFieldDisabled} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Use 'auto' if you're unsure about the region
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isFieldDisabled}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {Object.values(S3Provider).map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isFieldDisabled}>
                {isFieldDisabled ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isAddingCreds
                  ? "Adding the bucket"
                  : "Add Bucket"}
              </Button>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BucketForm;

