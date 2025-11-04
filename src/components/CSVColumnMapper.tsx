import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Upload } from 'lucide-react';

interface CSVColumnMapperProps {
  open: boolean;
  onClose: () => void;
  csvData: string[][];
  onConfirm: (mapping: ColumnMapping) => void;
}

export interface ColumnMapping {
  firstNameIndex: number;
  lastNameIndex: number;
  emailIndex: number;
  phoneIndex: number | null;
  ticketNumberIndex: number;
}

export default function CSVColumnMapper({ open, onClose, csvData, onConfirm }: CSVColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    firstNameIndex: -1,
    lastNameIndex: -1,
    emailIndex: -1,
    phoneIndex: null,
    ticketNumberIndex: -1,
  });

  if (csvData.length === 0) return null;

  const headers = csvData[0];
  const sampleRow = csvData[1] || [];

  const handleConfirm = () => {
    if (mapping.firstNameIndex === -1 || mapping.lastNameIndex === -1 || mapping.emailIndex === -1 || mapping.ticketNumberIndex === -1) {
      return;
    }
    onConfirm(mapping);
  };

  const isValid = mapping.firstNameIndex !== -1 && mapping.lastNameIndex !== -1 && mapping.emailIndex !== -1 && mapping.ticketNumberIndex !== -1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Map CSV Columns
          </DialogTitle>
          <DialogDescription>
            Match your CSV columns with the required fields. Preview the first row to ensure correct mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Required fields: First Name, Last Name, Email, Ticket Number. Phone is optional.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-semibold mb-2 text-sm">Preview (First Row)</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {sampleRow.map((cell, idx) => (
                <div key={idx} className="truncate" title={cell}>
                  <span className="font-medium text-muted-foreground">Col {idx + 1}:</span> {cell}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Select
                value={mapping.firstNameIndex.toString()}
                onValueChange={(val) => setMapping({ ...mapping, firstNameIndex: parseInt(val) })}
              >
                <SelectTrigger id="firstName">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      Column {idx + 1}: {header} ({sampleRow[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Select
                value={mapping.lastNameIndex.toString()}
                onValueChange={(val) => setMapping({ ...mapping, lastNameIndex: parseInt(val) })}
              >
                <SelectTrigger id="lastName">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      Column {idx + 1}: {header} ({sampleRow[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Select
                value={mapping.emailIndex.toString()}
                onValueChange={(val) => setMapping({ ...mapping, emailIndex: parseInt(val) })}
              >
                <SelectTrigger id="email">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      Column {idx + 1}: {header} ({sampleRow[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketNumber">Ticket Number *</Label>
              <Select
                value={mapping.ticketNumberIndex.toString()}
                onValueChange={(val) => setMapping({ ...mapping, ticketNumberIndex: parseInt(val) })}
              >
                <SelectTrigger id="ticketNumber">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      Column {idx + 1}: {header} ({sampleRow[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Select
                value={mapping.phoneIndex?.toString() || 'none'}
                onValueChange={(val) => setMapping({ ...mapping, phoneIndex: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger id="phone">
                  <SelectValue placeholder="Select column or skip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Skip (no phone column)</SelectItem>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      Column {idx + 1}: {header} ({sampleRow[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Import Players
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
