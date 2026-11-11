import { Metadata } from "next";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { InboxOutlined } from "@mui/icons-material";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800} letterSpacing={-0.8}>Goals</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.7 }}>Make room for the things you're saving toward.</Typography>
      </Box>
      <Paper sx={{ p: { xs: 3, md: 5 }, minHeight: 340, display: "grid", placeItems: "center", textAlign: "center" }}>
        <Stack alignItems="center" spacing={1.2} sx={{ maxWidth: 380 }}>
          <Box sx={{ width: 58, height: 58, borderRadius: 3, bgcolor: "action.hover", display: "grid", placeItems: "center", mb: 0.5 }}>
            <InboxOutlined sx={{ fontSize: 29, color: "text.secondary" }} />
          </Box>
          <Typography fontWeight={700} fontSize={17}>Nothing here just yet</Typography>
          <Typography color="text.secondary" variant="body2">Your savings goals will be tracked here.</Typography>
          <Button variant="outlined" sx={{ mt: 1, textTransform: "none" }} disabled>Create a goal</Button>
          <Typography variant="caption" color="text.disabled">This section is part of the BudgetNest development roadmap.</Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
