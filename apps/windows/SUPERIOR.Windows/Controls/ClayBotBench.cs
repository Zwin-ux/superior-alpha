using System.Globalization;
using System.Windows;
using System.Windows.Media;

namespace Superior.Windows.Controls;

public sealed class ClayBotBench : FrameworkElement
{
    public static readonly DependencyProperty BotBodyProperty =
        DependencyProperty.Register(nameof(BotBody), typeof(string), typeof(ClayBotBench), RenderProperty("gremlin"));

    public static readonly DependencyProperty BotColorProperty =
        DependencyProperty.Register(nameof(BotColor), typeof(string), typeof(ClayBotBench), RenderProperty("moss"));

    public static readonly DependencyProperty BotEyeProperty =
        DependencyProperty.Register(nameof(BotEye), typeof(string), typeof(ClayBotBench), RenderProperty("pixel"));

    public static readonly DependencyProperty EquippedSkillsCsvProperty =
        DependencyProperty.Register(nameof(EquippedSkillsCsv), typeof(string), typeof(ClayBotBench), RenderProperty(""));

    public static readonly DependencyProperty ReactionStateProperty =
        DependencyProperty.Register(nameof(ReactionState), typeof(string), typeof(ClayBotBench), RenderProperty(""));

    public string BotBody
    {
        get => (string)GetValue(BotBodyProperty);
        set => SetValue(BotBodyProperty, value);
    }

    public string BotColor
    {
        get => (string)GetValue(BotColorProperty);
        set => SetValue(BotColorProperty, value);
    }

    public string BotEye
    {
        get => (string)GetValue(BotEyeProperty);
        set => SetValue(BotEyeProperty, value);
    }

    public string EquippedSkillsCsv
    {
        get => (string)GetValue(EquippedSkillsCsvProperty);
        set => SetValue(EquippedSkillsCsvProperty, value);
    }

    public string ReactionState
    {
        get => (string)GetValue(ReactionStateProperty);
        set => SetValue(ReactionStateProperty, value);
    }

    protected override void OnRender(DrawingContext drawingContext)
    {
        base.OnRender(drawingContext);

        var width = ActualWidth;
        var height = ActualHeight;
        var scale = Math.Min(width / 420.0, height / 360.0);
        var center = new Point(width / 2.0, height * 0.46);
        var pigment = GetPigment(BotColor);
        var shadowBrush = new SolidColorBrush(Color.FromArgb(72, 42, 27, 19));

        drawingContext.PushTransform(new ScaleTransform(scale, scale, center.X, center.Y));
        DrawTable(drawingContext, center, shadowBrush);
        DrawBot(drawingContext, center, pigment);
        DrawSkills(drawingContext, center);
        DrawReaction(drawingContext, center);
        drawingContext.Pop();
    }

    private static FrameworkPropertyMetadata RenderProperty(string defaultValue)
    {
        return new FrameworkPropertyMetadata(defaultValue, FrameworkPropertyMetadataOptions.AffectsRender);
    }

    private void DrawTable(DrawingContext drawingContext, Point center, Brush shadowBrush)
    {
        var tableTop = new Rect(center.X - 190, center.Y + 98, 380, 54);
        drawingContext.DrawEllipse(shadowBrush, null, new Point(center.X, center.Y + 134), 150, 26);
        drawingContext.DrawRoundedRectangle(new SolidColorBrush(Color.FromRgb(190, 101, 67)), null, tableTop, 26, 22);
        drawingContext.DrawRoundedRectangle(new SolidColorBrush(Color.FromRgb(132, 71, 48)), null, new Rect(tableTop.X + 12, tableTop.Y + 32, tableTop.Width - 24, 42), 20, 18);
        drawingContext.DrawEllipse(new SolidColorBrush(Color.FromArgb(48, 255, 232, 184)), null, new Point(center.X - 55, tableTop.Y + 12), 118, 14);
    }

    private void DrawBot(DrawingContext drawingContext, Point center, Pigment pigment)
    {
        var head = new Rect(center.X - 112, center.Y - 108, 224, 202);
        var bodyBrush = new SolidColorBrush(pigment.Base);
        var shadowBrush = new SolidColorBrush(pigment.Shadow);
        var highlightBrush = new SolidColorBrush(Color.FromArgb(64, 255, 248, 229));

        if (BotBody == "orb")
        {
            head = new Rect(center.X - 100, center.Y - 104, 200, 200);
        }

        if (BotBody is "gremlin" or "core")
        {
            var antennaPen = new Pen(shadowBrush, 10) { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };
            drawingContext.DrawLine(antennaPen, new Point(center.X - 70, center.Y - 98), new Point(center.X - 86, center.Y - 146));
            drawingContext.DrawLine(antennaPen, new Point(center.X + 68, center.Y - 98), new Point(center.X + 82, center.Y - 150));
        }

        drawingContext.DrawEllipse(shadowBrush, null, new Point(center.X + 18, center.Y + 8), head.Width / 2.0, head.Height / 2.0);
        drawingContext.DrawEllipse(bodyBrush, null, center, head.Width / 2.0, head.Height / 2.0);
        drawingContext.DrawEllipse(highlightBrush, null, new Point(center.X - 48, center.Y - 54), 44, 16);

        if (BotBody == "scanner" || BotEye == "lens")
        {
            drawingContext.DrawEllipse(new SolidColorBrush(Color.FromRgb(208, 239, 236)), new Pen(new SolidColorBrush(Color.FromRgb(82, 111, 102)), 7), new Point(center.X, center.Y - 10), 34, 34);
            drawingContext.DrawEllipse(new SolidColorBrush(Color.FromArgb(128, 255, 255, 255)), null, new Point(center.X - 10, center.Y - 20), 8, 8);
        }
        else
        {
            var eyeBrush = BotEye == "glow" ? new SolidColorBrush(Color.FromRgb(220, 248, 255)) : new SolidColorBrush(Color.FromRgb(18, 16, 14));
            drawingContext.DrawRoundedRectangle(eyeBrush, null, new Rect(center.X - 44, center.Y - 22, 20, 20), 3, 3);
            drawingContext.DrawRoundedRectangle(eyeBrush, null, new Rect(center.X + 32, center.Y - 22, 20, 20), 3, 3);
        }

        if (BotBody == "gremlin")
        {
            drawingContext.DrawRoundedRectangle(new SolidColorBrush(Color.FromRgb(238, 218, 188)), null, new Rect(center.X + 86, center.Y - 22, 34, 48), 8, 8);
            drawingContext.DrawEllipse(new SolidColorBrush(Color.FromRgb(238, 218, 188)), null, new Point(center.X + 125, center.Y + 16), 18, 18);
        }

        var mouthPen = new Pen(new SolidColorBrush(Color.FromArgb(112, 45, 33, 26)), 5) { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };
        drawingContext.DrawLine(mouthPen, new Point(center.X - 22, center.Y + 44), new Point(center.X + 22, center.Y + 42));
    }

    private void DrawSkills(DrawingContext drawingContext, Point center)
    {
        var skills = EquippedSkillsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var clayBrush = new SolidColorBrush(Color.FromRgb(232, 214, 184));
        var pen = new Pen(new SolidColorBrush(Color.FromArgb(128, 77, 53, 39)), 4);

        foreach (var skill in skills)
        {
            switch (skill)
            {
                case "article-xray":
                    drawingContext.DrawEllipse(null, pen, new Point(center.X - 98, center.Y - 8), 22, 22);
                    break;
                case "page-explainer":
                    drawingContext.DrawRoundedRectangle(clayBrush, pen, new Rect(center.X + 82, center.Y - 48, 32, 42), 7, 7);
                    break;
                case "repo-reader":
                    drawingContext.DrawEllipse(clayBrush, pen, new Point(center.X + 92, center.Y + 58), 18, 18);
                    break;
                default:
                    drawingContext.DrawEllipse(clayBrush, pen, new Point(center.X, center.Y + 94), 16, 16);
                    break;
            }
        }
    }

    private void DrawReaction(DrawingContext drawingContext, Point center)
    {
        if (string.IsNullOrWhiteSpace(ReactionState))
        {
            return;
        }

        var success = ReactionState.Equals("success", StringComparison.OrdinalIgnoreCase);
        var fill = success ? Color.FromArgb(68, 181, 220, 156) : Color.FromArgb(76, 190, 82, 72);
        var stroke = success ? Color.FromRgb(71, 125, 76) : Color.FromRgb(125, 52, 45);
        var label = success ? "SNAP" : "JAM";
        var text = new FormattedText(
            label,
            CultureInfo.InvariantCulture,
            FlowDirection.LeftToRight,
            new Typeface("Segoe UI Black"),
            26,
            new SolidColorBrush(stroke),
            VisualTreeHelper.GetDpi(this).PixelsPerDip);

        drawingContext.DrawEllipse(new SolidColorBrush(fill), new Pen(new SolidColorBrush(stroke), 5), new Point(center.X, center.Y), 146, 126);
        drawingContext.DrawRoundedRectangle(new SolidColorBrush(Color.FromArgb(196, 241, 216, 174)), new Pen(new SolidColorBrush(stroke), 4), new Rect(center.X - 48, center.Y + 78, 96, 36), 12, 12);
        drawingContext.DrawText(text, new Point(center.X - text.Width / 2, center.Y + 80));
    }

    private static Pigment GetPigment(string colorId)
    {
        return colorId switch
        {
            "skyBlue" => new Pigment(Color.FromRgb(107, 168, 190), Color.FromRgb(68, 111, 130)),
            "brickRed" => new Pigment(Color.FromRgb(185, 92, 72), Color.FromRgb(124, 57, 48)),
            "sunGold" => new Pigment(Color.FromRgb(216, 168, 73), Color.FromRgb(145, 101, 36)),
            "lavender" => new Pigment(Color.FromRgb(166, 139, 190), Color.FromRgb(111, 89, 132)),
            "chalkWhite" => new Pigment(Color.FromRgb(226, 218, 198), Color.FromRgb(154, 145, 128)),
            "charcoal" => new Pigment(Color.FromRgb(75, 73, 70), Color.FromRgb(42, 40, 38)),
            _ => new Pigment(Color.FromRgb(122, 155, 100), Color.FromRgb(78, 106, 64))
        };
    }

    private readonly record struct Pigment(Color Base, Color Shadow);
}
