import { SparklesIcon, CrossIcon, RefreshIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { s } from "../../styles";
import type { ComponentProps } from "../types";
import { AISummaryBlockStatus } from "../nodes/AISummaryBlock";
import { getAIService } from "../../utils/ServiceRegistry";

type Props = ComponentProps;

const AISummaryBlock = (props: Props) => {
  const { node, isSelected } = props;
  const { summary, error, status, documentId } = node.attrs;
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const fetchSummary = React.useCallback(async () => {
    if (!documentId) {
      return;
    }

    const aiService = getAIService();
    if (!aiService) {
      // AI service not registered, show error
      if (props.onUpdate) {
        props.onUpdate({
          status: AISummaryBlockStatus.Error,
          error: t("AI service is not configured"),
        });
      }
      return;
    }

    try {
      const result = await aiService.summarizeDocument(documentId);
      if (props.onUpdate) {
        props.onUpdate({
          status: AISummaryBlockStatus.Success,
          summary: result.summary,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("Failed to generate summary");
      if (props.onUpdate) {
        props.onUpdate({
          status: AISummaryBlockStatus.Error,
          error: errorMessage,
        });
      }
    }
  }, [documentId, props.onUpdate, t]);

  React.useEffect(() => {
    if (status === AISummaryBlockStatus.Loading && !summary && !error) {
      fetchSummary();
    }
  }, [status, summary, error, fetchSummary]);

  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    try {
      const aiService = getAIService();
      if (!aiService) {
        if (props.onUpdate) {
          props.onUpdate({
            status: AISummaryBlockStatus.Error,
            error: t("AI service is not configured"),
          });
        }
        return;
      }

      const result = await aiService.summarizeDocument(documentId);
      if (props.onUpdate) {
        props.onUpdate({
          status: AISummaryBlockStatus.Success,
          summary: result.summary,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("Failed to generate summary");
      if (props.onUpdate) {
        props.onUpdate({
          status: AISummaryBlockStatus.Error,
          error: errorMessage,
        });
      }
    } finally {
      setIsRetrying(false);
    }
  }, [documentId, props.onUpdate, t]);

  const className = isSelected
    ? "ai-summary-block ProseMirror-selectednode"
    : "ai-summary-block";

  return (
    <Wrapper contentEditable={false} className={className}>
      <Header>
        <IconWrapper>
          <SparklesIcon size={16} />
        </IconWrapper>
        <Title>{t("AI Summary")}</Title>
        {status === AISummaryBlockStatus.Error && (
          <RetryButton
            onClick={handleRetry}
            disabled={isRetrying}
            aria-label={t("Retry")}
          >
            <RefreshIcon size={14} />
          </RetryButton>
        )}
      </Header>

      <Content>
        {status === AISummaryBlockStatus.Loading && (
          <LoadingWrapper>
            <Spinner />
            <LoadingText>{t("Generating summary...")}</LoadingText>
          </LoadingWrapper>
        )}

        {status === AISummaryBlockStatus.Success && summary && (
          <SummaryText>{summary}</SummaryText>
        )}

        {status === AISummaryBlockStatus.Error && (
          <ErrorWrapper>
            <ErrorIcon>
              <CrossIcon size={16} />
            </ErrorIcon>
            <ErrorMessage>
              <ErrorTitle>{t("Failed to generate summary")}</ErrorTitle>
              <ErrorDetails>{error || t("An unknown error occurred")}</ErrorDetails>
            </ErrorMessage>
          </ErrorWrapper>
        )}
      </Content>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  background: ${s("backgroundSecondary")};
  border-radius: 8px;
  border: 1px solid ${s("divider")};
  padding: 16px;
  margin: 8px 0;
  user-select: none;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${s("accent")}20;
  border-radius: 6px;
  color: ${s("accent")};
`;

const Title = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${s("text")};
`;

const RetryButton = styled.button`
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid ${s("divider")};
  background: ${s("background")};
  border-radius: 6px;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  transition: all 150ms ease-in-out;

  &:hover:not(:disabled) {
    color: ${s("text")};
    border-color: ${s("textTertiary")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`;

const Content = styled.div`
  padding: 0 36px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${s("divider")};
  border-top-color: ${s("accent")};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.span`
  font-size: 14px;
  color: ${s("textSecondary")};
`;

const SummaryText = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: ${s("text")};
  margin: 0;
`;

const ErrorWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const ErrorIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: ${s("danger")}20;
  border-radius: 4px;
  color: ${s("danger")};
  flex-shrink: 0;
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ErrorTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${s("danger")};
`;

const ErrorDetails = styled.span`
  font-size: 13px;
  color: ${s("textSecondary")};
  line-height: 1.5;
`;

export default AISummaryBlock;
