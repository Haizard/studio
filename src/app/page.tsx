
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, FileText, Eye, EyeOff, Settings2, Trash2 } from "lucide-react";
import MarkdownPreview from "@/components/MarkdownPreview";
import MetricsDisplay from "@/components/MetricsDisplay";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCAL_STORAGE_KEY = "justJotContent_v1";

export default function HomePage() {
  const [text, setText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedText = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedText) {
        setText(savedText);
      }
    } catch (error) {
      console.error("Failed to load from local storage:", error);
      toast({ title: "Error", description: "Could not load saved content.", variant: "destructive" });
    }
  }, [toast]);

  const handleSave = useCallback(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, text);
      toast({ title: "Saved!", description: "Your jottings have been saved locally." });
    } catch (error) {
      console.error("Failed to save to local storage:", error);
      toast({ title: "Error", description: "Could not save content. Local storage might be full or disabled.", variant: "destructive" });
    }
  }, [text, toast, isMounted]);

  const handleLoad = useCallback(() => {
    if (!isMounted) return;
    try {
      const savedText = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedText) {
        setText(savedText);
        toast({ title: "Loaded!", description: "Your jottings have been loaded." });
      } else {
        toast({ title: "Nothing to load", description: "No saved jottings found." });
      }
    } catch (error) {
      console.error("Failed to load from local storage:", error);
      toast({ title: "Error", description: "Could not load saved content.", variant: "destructive" });
    }
  }, [toast, isMounted]);
  
  const handleClear = useCallback(() => {
    if (!isMounted) return;
    setText("");
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({ title: "Cleared!", description: "Content cleared and removed from local storage." });
    } catch (error) {
       console.error("Failed to clear local storage:", error);
       toast({ title: "Error", description: "Could not clear content from local storage.", variant: "destructive" });
    }
  }, [toast, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          event.preventDefault();
          handleSave();
        }
        if (event.key === 'e') {
          event.preventDefault();
          setShowPreview(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, isMounted]);
  
  useEffect(() => {
    if (!isMounted) return;
    let autoSaveTimeoutId: NodeJS.Timeout;
    if (text !== localStorage.getItem(LOCAL_STORAGE_KEY)) {
       autoSaveTimeoutId = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save 2 seconds after last change
    }
    return () => clearTimeout(autoSaveTimeoutId);
  }, [text, handleSave, isMounted]);


  if (!isMounted) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground font-body items-center justify-center p-4 text-center">
        <h1 className="text-3xl font-headline text-primary mb-4">Just Jot</h1>
        <p className="text-muted-foreground">Loading your distraction-free editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="p-3 border-b border-border bg-card flex items-center justify-between shadow-sm print:hidden">
        <h1 className="text-xl md:text-2xl font-headline text-primary">Just Jot</h1>
        
        <div className="absolute left-1/2 top-3 -translate-x-1/2 px-2">
           <MetricsDisplay text={text} />
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save document" title="Save (Ctrl/Cmd + S)">
            <Save className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLoad} aria-label="Load document" title="Load last saved">
            <FileText className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowPreview(!showPreview)} aria-label={showPreview ? "Show editor" : "Show preview"} title={showPreview ? "Show Editor (Ctrl/Cmd + E)" : "Show Preview (Ctrl/Cmd + E)"}>
            {showPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options" title="More options">
                <Settings2 className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClear}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Content
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-3 md:p-4 overflow-hidden">
        {showPreview ? (
          <MarkdownPreview markdownText={text} />
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start jotting..."
            className="flex-1 w-full p-4 text-lg border-input focus:ring-primary resize-none bg-card rounded-md shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
            aria-label="Text editor"
          />
        )}
      </main>
    </div>
  );
}
