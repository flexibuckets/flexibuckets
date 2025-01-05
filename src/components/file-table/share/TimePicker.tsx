import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TimeValues } from "@/lib/types";
import { Lock } from "lucide-react";

type TimePickerProps = {
  timeOptions: TimeValues[];
  onTimeChange: (val: string) => void;
};

const TimePicker = ({ timeOptions, onTimeChange }: TimePickerProps) => {
  return (
    <div className="w-full space-y-1">
      <Label>Share Link Expires in</Label>
      <Select onValueChange={(val) => onTimeChange(val)} defaultValue="1_day">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Time" />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem
              key={option.value}
              disabled={option.isLocked}
              value={option.value}>
              <span className="flex items-center">
                {option.label}
                {option.isLocked ? (
                  <span className="flex items-center text-xs">
                    <Lock className="h-4 w-4 ml-2 mr-1 text-yellow-400" />
                    Premium Plan Required
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker;
