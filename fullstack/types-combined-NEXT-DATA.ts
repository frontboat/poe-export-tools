export type Root = {
    props: {
        pageProps: {
            data: {
                mainQuery: {
                    chatShare: {
                        chatBot: {
                            deletionState: string;
                            displayName: string;
                            picture: {
                                __typename: string;
                                __isBotPicture: string;
                                url: string;
                            };
                            __isNode: string;
                            id: string;
                            handle: string;
                            nickname: string;
                        };
                        shareCode: string;
                        creationTime: number;
                        membersCount: number;
                        shareId: number;
                        messages: Array<{
                            id: string;
                            didSkipContext: boolean;
                            creationTime: number;
                            messageId: number;
                            author: string;
                            isChatAnnouncement: boolean;
                            isEdited: boolean;
                            authorBot: {
                                id: string;
                                botId: number;
                                handle: string;
                                introduction: string;
                                nickname: string;
                                viewerIsCreator: boolean;
                                isTrustedBot: boolean;
                                isPrivateBot: boolean;
                                canvasContent: any;
                                messageTimeoutSecs: number;
                                allowsImageAttachments: boolean;
                                isApiBot: boolean;
                                limitedAccessType: string;
                                shouldHideLimitedAccessTag: boolean;
                                translatedBotTags: Array<string>;
                                deletionState: string;
                                displayName: string;
                                picture?: {
                                    __typename: string;
                                    __isBotPicture: string;
                                    url: string;
                                };
                                __isNode: string;
                                supportsRemix: boolean;
                                isServerBot: boolean;
                                supportsFileUpload: boolean;
                                customUIDefinition?: string;
                            };
                            isAuthorSharer: boolean;
                            authorUser?: {
                                fullName: string;
                                id: string;
                                uid: number;
                                handle: string;
                                viewerIsFollowing: boolean;
                                isDeleted: boolean;
                                smallProfilePhotoUrl: string;
                                __isNode: string;
                            };
                            command: any;
                            referencedMessage: any;
                            text: string;
                            attachments: Array<{
                                __isAttachment: string;
                                id: string;
                                isInline: boolean;
                                file: {
                                    mimeType: string;
                                    width: number;
                                    height: number;
                                    id: string;
                                    size: number;
                                    url: string;
                                    thumbnailUrl: any;
                                };
                                name: string;
                                url: string;
                                attachmentId: number;
                            }>;
                            __isNode: string;
                        }>;
                        __isNode: string;
                        id: string;
                        hasMessagesFromMultipleUsers: boolean;
                        twittercardProperties: string;
                        opengraphProperties: string;
                    };
                    viewer: {
                        poeUser: any;
                        enableCanvasAppDebugMode: boolean;
                        canvasPreviewUrlOverride: string;
                        useInFrameCanvasServerRelay: boolean;
                        useStrictCsp: boolean;
                        markdownCharacterLimit: number;
                        botMarkdownCharacterLimit: number;
                        promptBotImageDomainWhitelist: Array<string>;
                        enableScriptingCodeReference: boolean;
                        enableScriptBotCreation: boolean;
                        useMessageSendingIcon: boolean;
                        poeHideLeftSideMessageHeaderIfSameSender: boolean;
                        defaultBot: any;
                        showTimestampAndDatePill: boolean;
                        badgingEnabledProportion: number;
                        id: string;
                    };
                    supportedPreviewsContentTypes: Array<string>;
                };
                blockerQuery: {
                };
                leftNavigationSidebarQuery: {
                    viewer: {
                        uid: any;
                        shouldSeeRevshareEntryPoints: boolean;
                        revshareEnrollmentStatus: string;
                        hasActiveSubscription: boolean;
                        isEligibleForWebSubscriptions: boolean;
                        subscription: any;
                        poeUser: any;
                        apiConsoleEnabled: boolean;
                        shouldSeePrivacyChoicesLink: boolean;
                        id: string;
                        badgeInfo: {
                            unseenChatInfos: Array<any>;
                        };
                        badgingEnabledProportion: number;
                        poeWebEnableChatPinning: boolean;
                        poeWebEnableChatPinningVisibility: boolean;
                        poeWebEnableMarkChatAsRead: boolean;
                        badgingLogEnabled: boolean;
                        badgingDiscrepancyLoggingSamplingRate: number;
                        badgingDiscrepancyLoggingInterval: number;
                        badgingDiscrepancyLoggingInitialDelay: number;
                    };
                    chats: {
                        edges: Array<any>;
                        pageInfo: {
                            endCursor: any;
                            hasNextPage: boolean;
                        };
                        id: string;
                    };
                };
                pageWrapperQuery: {
                    viewer: {
                        hasCompletedMultiplayerNux: boolean;
                        uid: any;
                        id: string;
                        announcement: any;
                        messagePointInfo: any;
                        poeUser: any;
                        shouldOpenLinksInApp: boolean;
                        shouldIncludeGoogleTagManager: boolean;
                        badgeInfo: {
                            unseenChatInfos: Array<any>;
                        };
                        badgingEnabledProportion: number;
                    };
                };
            };
            errorCode: any;
            fetchPolicy: string;
            staticPage: boolean;
        };
        initialProps: {
            menuSidebarPreference: number;
            userAgent: string;
            theme: string;
            soundNotificationsMuted: boolean;
            middlewareStart: number;
            middlewareEnd: number;
            i18nInstanceState: {
                ns: Array<string>;
                lng: string;
            };
            tchannelData: {
                minSeq: string;
                channel: string;
                channelHash: string;
                boxName: string;
                baseHost: string;
                targetUrl: string;
                enableWebsocket: boolean;
            };
        };
        getInitialPropsDuration: number;
    };
    page: string;
    query: {
        shareCode: string;
    };
    buildId: string;
    assetPrefix: string;
    isFallback: boolean;
    isExperimentalCompile: boolean;
    dynamicIds: Array<number>;
    gip: boolean;
    appGip: boolean;
    scriptLoader: Array<any>;
};