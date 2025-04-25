import React, { useState } from 'react';
import { Share2, Loader2, Lock, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TimePicker from './TimePicker';
import { TimeValues } from '@/lib/types';
import { addTimeToNow } from '@/lib/utils';
import { ShareMutation, SharedResponse } from '@/lib/types/share';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import SharingExpire from './SharingExpire';
import CopyBtn from '@/components/ui/copy-button';
import { Switch } from '@/components/ui/switch';

type DialogType = 'File' | 'Folder';

type ShareDialogProps = {
  mutation: ShareMutation;
  dialogType: DialogType;
  downloadUrl: string;
  id: string;
  name: string;
  sharedResponse?: SharedResponse;
  fileSize: string;
  teamId?: string;
};

const ShareDialog = ({
  mutation,
  dialogType,
  id,
  name,
  downloadUrl,
  sharedResponse,
  fileSize,
  teamId,
}: ShareDialogProps) => {
  const timeOptions: TimeValues[] = [
    { value: '1_hour', label: '1 Hour' },
    { value: '12_hours', label: '12 Hours' },
    { value: '1_day', label: '1 Day' },
    { value: '3_days', label: '3 Days' },
    { value: '1_week', label: '1 Week' },
    { value: 'unlimited', label: 'Never Expire' },
  ];
  const [isOpen, setIsOpen] = useState(false);

  const [expiresAt, setExpiresAt] = useState<string | null>(
    sharedResponse?.expiresAt?.toString() || addTimeToNow('1_day')
  );

  const [isInfinite, setIsInfinite] = useState(false);

  const onTimeChange = (val: string) => {
    if (val === 'unlimited') {
      setExpiresAt(null);
    } else {
      const time = addTimeToNow(val);
      setExpiresAt(time);
    }
  };

  const handleShare = () => {
    mutation.mutate({
      id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      teamId,
      fileSize,
      isInfinite,
    });
  };

  return (
    <>
      <Button
        variant="info"
        onClick={() => setIsOpen(true)}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="mr-2 h-4 w-4" />
        )}

        <span>{mutation.isPending ? 'Sharing...' : `Share ${dialogType}`}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {downloadUrl
                ? `${dialogType} is Public`
                : `Make ${dialogType} Public?`}
            </DialogTitle>
            {getDescription(!!downloadUrl, name, dialogType)}
          </DialogHeader>
          <div className="w-full flex flex-col gap-y-4">
            <div className="bg-muted group rounded-md py-3 flex justify-center items-center relative ">
              {downloadUrl ? (
                <>
                  <span className="max-w-[40ch] truncate">{downloadUrl}</span>
                  <div className="absolute hidden group-hover:flex right-6 bg-gradient-to-r from-transparent to-muted  w-8 z-[1000]">
                    <CopyBtn text={downloadUrl} />
                  </div>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Open the lock by sharing the file publicly.
                </>
              )}
            </div>
            {sharedResponse && downloadUrl ? (
              <SharingExpire expiresAt={sharedResponse.expiresAt} />
            ) : (
              <>
                <TimePicker
                  timeOptions={timeOptions}
                  onTimeChange={onTimeChange}
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="infinite-sharing"
                    checked={isInfinite}
                    onCheckedChange={setIsInfinite}
                  />
                  <label htmlFor="infinite-sharing">
                    Enable infinite sharing
                  </label>
                </div>
                <Button
                  onClick={handleShare}
                  disabled={mutation.isPending}
                  variant="info"
                  className="self-end"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating
                      Link...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Make Public
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const getDescription = (
  isShared: boolean,
  name: string,
  dialogType: DialogType
) => {
  if (!isShared) {
    return (
      <DialogDescription>
        This action cannot be undone. This will make{' '}
        <Badge className="mr-2">{name}</Badge>
        public for the selected time.
      </DialogDescription>
    );
  } else {
    return (
      <DialogDescription>
        {dialogType} <Badge className="mr-2">{name}</Badge>
        is shared publicly.
      </DialogDescription>
    );
  }
};

export default ShareDialog;
