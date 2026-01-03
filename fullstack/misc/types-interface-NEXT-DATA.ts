export interface Root {
    props: Props;
    page: string;
    query: Query;
    buildId: string;
    assetPrefix: string;
    isFallback: boolean;
    isExperimentalCompile: boolean;
    dynamicIds: number[];
    gip: boolean;
    appGip: boolean;
    scriptLoader: any[];
}

export interface Props {
    pageProps: PageProps;
    initialProps: InitialProps;
    getInitialPropsDuration: number;
}

export interface PageProps {
    data: Data;
    errorCode: any;
    fetchPolicy: string;
    staticPage: boolean;
}

export interface Data {
    mainQuery: MainQuery;
    blockerQuery: BlockerQuery;
    leftNavigationSidebarQuery: LeftNavigationSidebarQuery;
    pageWrapperQuery: PageWrapperQuery;
}

export interface MainQuery {
    chatShare: ChatShare;
    viewer: Viewer;
    supportedPreviewsContentTypes: string[];
}

export interface ChatShare {
    chatBot: ChatBot;
    shareCode: string;
    creationTime: number;
    membersCount: number;
    shareId: number;
    messages: Message[];
    __isNode: string;
    id: string;
    hasMessagesFromMultipleUsers: boolean;
    twittercardProperties: string;
    opengraphProperties: string;
}

export interface ChatBot {
    deletionState: string;
    displayName: string;
    picture: Picture;
    __isNode: string;
    id: string;
    handle: string;
    nickname: string;
}

export interface Picture {
    __typename: string;
    __isBotPicture: string;
    url: string;
}

export interface Message {
    id: string;
    didSkipContext: boolean;
    creationTime: number;
    messageId: number;
    author: string;
    isChatAnnouncement: boolean;
    isEdited: boolean;
    authorBot: AuthorBot;
    isAuthorSharer: boolean;
    authorUser?: AuthorUser;
    command: any;
    referencedMessage: any;
    text: string;
    attachments: Attachment[];
    __isNode: string;
}

export interface AuthorBot {
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
    translatedBotTags: string[];
    deletionState: string;
    displayName: string;
    picture?: Picture2;
    __isNode: string;
    supportsRemix: boolean;
    isServerBot: boolean;
    supportsFileUpload: boolean;
    customUIDefinition?: string;
}

export interface Picture2 {
    __typename: string;
    __isBotPicture: string;
    url: string;
}

export interface AuthorUser {
    fullName: string;
    id: string;
    uid: number;
    handle: string;
    viewerIsFollowing: boolean;
    isDeleted: boolean;
    smallProfilePhotoUrl: string;
    __isNode: string;
}

export interface Attachment {
    __isAttachment: string;
    id: string;
    isInline: boolean;
    file: File;
    name: string;
    url: string;
    attachmentId: number;
}

export interface File {
    mimeType: string;
    width: number;
    height: number;
    id: string;
    size: number;
    url: string;
    thumbnailUrl: any;
}

export interface Viewer {
    poeUser: any;
    enableCanvasAppDebugMode: boolean;
    canvasPreviewUrlOverride: string;
    useInFrameCanvasServerRelay: boolean;
    useStrictCsp: boolean;
    markdownCharacterLimit: number;
    botMarkdownCharacterLimit: number;
    promptBotImageDomainWhitelist: string[];
    enableScriptingCodeReference: boolean;
    enableScriptBotCreation: boolean;
    useMessageSendingIcon: boolean;
    poeHideLeftSideMessageHeaderIfSameSender: boolean;
    defaultBot: any;
    showTimestampAndDatePill: boolean;
    badgingEnabledProportion: number;
    id: string;
}

export interface BlockerQuery {
}

export interface LeftNavigationSidebarQuery {
    viewer: Viewer2;
    chats: Chats;
}

export interface Viewer2 {
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
    badgeInfo: BadgeInfo;
    badgingEnabledProportion: number;
    poeWebEnableChatPinning: boolean;
    poeWebEnableChatPinningVisibility: boolean;
    poeWebEnableMarkChatAsRead: boolean;
    badgingLogEnabled: boolean;
    badgingDiscrepancyLoggingSamplingRate: number;
    badgingDiscrepancyLoggingInterval: number;
    badgingDiscrepancyLoggingInitialDelay: number;
}

export interface BadgeInfo {
    unseenChatInfos: any[];
}

export interface Chats {
    edges: any[];
    pageInfo: PageInfo;
    id: string;
}

export interface PageInfo {
    endCursor: any;
    hasNextPage: boolean;
}

export interface PageWrapperQuery {
    viewer: Viewer3;
}

export interface Viewer3 {
    hasCompletedMultiplayerNux: boolean;
    uid: any;
    id: string;
    announcement: any;
    messagePointInfo: any;
    poeUser: any;
    shouldOpenLinksInApp: boolean;
    shouldIncludeGoogleTagManager: boolean;
    badgeInfo: BadgeInfo2;
    badgingEnabledProportion: number;
}

export interface BadgeInfo2 {
    unseenChatInfos: any[];
}

export interface InitialProps {
    menuSidebarPreference: number;
    userAgent: string;
    theme: string;
    soundNotificationsMuted: boolean;
    middlewareStart: number;
    middlewareEnd: number;
    i18nInstanceState: I18nInstanceState;
    tchannelData: TchannelData;
}

export interface I18nInstanceState {
    ns: string[];
    lng: string;
}

export interface TchannelData {
    minSeq: string;
    channel: string;
    channelHash: string;
    boxName: string;
    baseHost: string;
    targetUrl: string;
    enableWebsocket: boolean;
}

export interface Query {
    shareCode: string;
}