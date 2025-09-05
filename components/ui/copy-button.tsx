"use client"

import { useState } from "react"
import { Clipboard, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CopyButtonProps {
  textToCopy: string
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(textToCopy)
    setHasCopied(true)
    setTimeout(() => {
      setHasCopied(false)
    }, 2000) // O feedback visual dura 2 segundos
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            className="h-8 w-8" // Ajuste de tamanho para se encaixar bem na UI
          >
            {hasCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasCopied ? "Copiado!" : "Copiar"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}