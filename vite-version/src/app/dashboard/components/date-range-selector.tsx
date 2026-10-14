import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DateRangeSelector() {
  return (
    <Select defaultValue="30d">
      <SelectTrigger size="sm" className="w-36">
        <SelectValue placeholder="Date range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 3 months</SelectItem>
        <SelectItem value="12m">Last 12 months</SelectItem>
      </SelectContent>
    </Select>
  )
}
