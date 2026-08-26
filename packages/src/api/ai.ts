import { customInstance } from './mutator';

export interface AskMetadataCmd {
  query: string;
  domain?: string;
  limit?: number;
}

export interface MatchedAssetCardVO {
  assetId: string;
  assetName: string;
  title: string;
  domain?: string;
  confidenceText?: string;
  matchReason?: string;
  healthScore?: number;
  qualityBand?: string;
  taintStatus?: string;
}

export interface AskMetadataVO {
  query: string;
  reply: string;
  queryIntent: string;
  matchedAssets: MatchedAssetCardVO[];
  fallback: boolean;
}

export interface SingleResult<T> {
  code: string;
  message?: string;
  data: T;
  success?: boolean;
}

/**
 * AI 自然语言智能找数
 */
export const askMetadata = (data: AskMetadataCmd) => {
  return customInstance<SingleResult<AskMetadataVO>>({
    url: '/api/ai/ask-metadata',
    method: 'POST',
    data,
  });
};
