import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async moderate(content: string) {
    const isNSFW = /nsfw|18\+/i.test(content);
    const isMinor = /minor|underage/i.test(content);
    return { isNSFW, isMinor, action: isNSFW || isMinor ? 'shadowban' : 'allow' };
  }

  async subtitles(text: string, targetLang = 'en') {
    return { original: text, language: targetLang, translated: text };
  }
}

