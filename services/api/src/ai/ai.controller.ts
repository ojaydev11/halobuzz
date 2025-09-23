import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('moderate')
  moderate(@Body() body: { content: string }) {
    return this.aiService.moderate(body.content);
  }

  @Post('subtitles')
  subtitles(@Body() body: { text: string; targetLang?: string }) {
    return this.aiService.subtitles(body.text, body.targetLang);
  }
}

